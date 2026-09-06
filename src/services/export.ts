// On-device CSV/PDF export + CSV import (docs/API_DESIGN.md,
// docs/USER_FLOWS.md Flow 7 + Flow 13). Both run entirely on-device, no
// network call — export hands off via the OS share sheet, import reads a
// file chosen through the OS document picker
// (docs/ARCHITECTURE.md "export.ts # CSV/PDF generation, CSV import parsing
// (Phase 2)").
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { getDb } from '../db/client';
import { currencies } from '../db/schema';
import * as accountRepository from '../repositories/accountRepository';
import * as categoryRepository from '../repositories/categoryRepository';
import * as settingsRepository from '../repositories/settingsRepository';
import * as transactionRepository from '../repositories/transactionRepository';
import type { Category } from '../repositories/categoryRepository';
import type { Transaction } from '../repositories/transactionRepository';
import { PaywallRequiredError, ValidationError } from '../types/errors';
import { isValidOccurredAt } from '../utils/date';
import { majorToMinor, minorToMajor } from '../utils/money';

/** Export/import is a single Pro-only feature (docs/MONETIZATION.md "CSV export and import"). */
async function assertExportAllowed(): Promise<void> {
  const settings = await settingsRepository.get();
  if (!settings.isPro) {
    throw new PaywallRequiredError('export', 'CSV/PDF export requires Pro.');
  }
}

export interface ExportRange {
  from?: string;
  to?: string;
}

interface ExportRow {
  date: string;
  type: string;
  amount: string;
  currency: string;
  baseAmount: string;
  baseCurrency: string;
  category: string;
  note: string;
}

async function buildRows(range?: ExportRange): Promise<ExportRow[]> {
  const [txs, categories, allCurrencies] = await Promise.all([
    transactionRepository.list({ from: range?.from, to: range?.to }),
    categoryRepository.list(),
    getDb().select().from(currencies),
  ]);

  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
  const decimalDigitsByCode = new Map(allCurrencies.map((c) => [c.code, c.decimalDigits]));

  const formatAmount = (amountMinor: number, currencyCode: string): string => {
    const decimals = decimalDigitsByCode.get(currencyCode) ?? 2;
    return minorToMajor(amountMinor, decimals).toFixed(decimals);
  };

  return txs.map(
    (tx: Transaction): ExportRow => ({
      date: tx.occurredAt.slice(0, 10),
      type: tx.type,
      amount: formatAmount(tx.amountMinor, tx.currencyCode),
      currency: tx.currencyCode,
      baseAmount:
        tx.baseAmountMinor != null && tx.baseCurrencyCode
          ? formatAmount(tx.baseAmountMinor, tx.baseCurrencyCode)
          : '',
      baseCurrency: tx.baseCurrencyCode ?? '',
      category: tx.categoryId ? (categoryNameById.get(tx.categoryId) ?? '') : '',
      note: tx.note ?? '',
    }),
  );
}

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function toCsv(rows: ExportRow[]): string {
  const header = ['Date', 'Type', 'Amount', 'Currency', 'Base Amount', 'Base Currency', 'Category', 'Note'];
  const lines = [header.join(',')];
  for (const row of rows) {
    lines.push(
      [row.date, row.type, row.amount, row.currency, row.baseAmount, row.baseCurrency, row.category, row.note]
        .map(escapeCsvField)
        .join(','),
    );
  }
  return lines.join('\n');
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function toHtml(rows: ExportRow[]): string {
  const tableRows = rows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.date)}</td><td>${escapeHtml(r.type)}</td><td>${escapeHtml(r.amount)} ${escapeHtml(r.currency)}</td><td>${escapeHtml(r.baseAmount)} ${escapeHtml(r.baseCurrency)}</td><td>${escapeHtml(r.category)}</td><td>${escapeHtml(r.note)}</td></tr>`,
    )
    .join('');
  return `<html><head><meta charset="utf-8"><style>
    body { font-family: -apple-system, Roboto, sans-serif; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
    th { background: #f2f2f2; }
  </style></head><body>
    <h2>Spendtr Export</h2>
    <table><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Base Amount</th><th>Category</th><th>Note</th></tr></thead>
    <tbody>${tableRows}</tbody></table>
  </body></html>`;
}

async function shareFile(uri: string, mimeType: string, dialogTitle: string): Promise<void> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType, dialogTitle });
  }
}

export async function exportTransactionsCsv(range?: ExportRange): Promise<string> {
  await assertExportAllowed();
  const rows = await buildRows(range);
  const csv = toCsv(rows);
  const file = new File(Paths.cache, `spendtr-export-${Date.now()}.csv`);
  file.create();
  file.write(csv);
  await shareFile(file.uri, 'text/csv', 'Export transactions (CSV)');
  return file.uri;
}

export async function exportTransactionsPdf(range?: ExportRange): Promise<string> {
  await assertExportAllowed();
  const rows = await buildRows(range);
  const html = toHtml(rows);
  const { uri } = await Print.printToFileAsync({ html });
  await shareFile(uri, 'application/pdf', 'Export transactions (PDF)');
  return uri;
}

// -------------------------------------------------------------- CSV import
// docs/USER_FLOWS.md Flow 13: pick a file -> map columns against a live
// preview -> import runs entirely on-device -> summary of imported vs
// skipped rows with a reason per skip.

export interface CsvParseResult {
  headers: string[];
  rows: string[][];
}

/**
 * Minimal RFC4180-ish CSV parser: comma-delimited, double-quote quoting
 * with `""` as an escaped quote, quoted fields may contain commas/newlines.
 * The first row is always treated as the header row (docs/USER_FLOWS.md
 * Flow 13 step 2 / the design's "header row detected").
 */
export function parseCsv(text: string): CsvParseResult {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...dataRows] = rows;
  return { headers: headers ?? [], rows: dataRows };
}

export type DecimalStyle = 'dot' | 'comma';

export interface CsvColumnMapping {
  dateColumn: number;
  amountColumn: number;
  /** null = "skip this column" (docs/design_system/templates/spendtr-app/data-mgmt.jsx). */
  noteColumn: number | null;
  /** null = every row uses `CsvImportOptions.defaultCurrencyCode`. */
  currencyColumn: number | null;
  /** null = every row is imported uncategorized. */
  categoryColumn: number | null;
  decimalStyle: DecimalStyle;
}

export interface CsvImportOptions {
  accountId: string;
  /** Used for any row whose currency column is unmapped, blank, or unknown. */
  defaultCurrencyCode: string;
}

export interface CsvRowResult {
  rowNumber: number;
  status: 'ready' | 'skipped';
  reason?: string;
  occurredAt?: string;
  /** Absolute value, major units (e.g. 41.87) — converted to minor units once the row's real currency (and its decimal digits) is confirmed. */
  amountMajorAbs?: number;
  currencyCode?: string;
  type?: 'expense' | 'income';
  note?: string;
  categoryName?: string;
}

function parseCsvDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseCsvAmount(raw: string, decimalStyle: DecimalStyle): number | null {
  let s = raw.trim().replace(/[^0-9.,-]/g, '');
  if (!s) return null;
  s = decimalStyle === 'comma' ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

/**
 * Evaluates every row against the mapping without touching the database —
 * used both for the live "first 5 rows" preview and, row-by-row, as the
 * first pass of `importTransactionsFromCsv`. Currency codes are checked
 * against the real `currencies` table so an unknown code is caught here
 * rather than surfacing as a generic ValidationError during the write pass.
 */
export async function evaluateCsvRows(
  parsed: CsvParseResult,
  mapping: CsvColumnMapping,
  options: CsvImportOptions,
): Promise<CsvRowResult[]> {
  const db = getDb();
  const knownCurrencyCodes = new Set((await db.select({ code: currencies.code }).from(currencies)).map((c) => c.code));

  return parsed.rows.map((cells, i): CsvRowResult => {
    const rowNumber = i + 2; // +1 for the header row, +1 for 1-indexing.
    const dateRaw = cells[mapping.dateColumn] ?? '';
    const occurredAt = parseCsvDate(dateRaw);
    if (!occurredAt) return { rowNumber, status: 'skipped', reason: `No usable date in "${dateRaw || '(blank)'}"` };
    if (!isValidOccurredAt(occurredAt)) return { rowNumber, status: 'skipped', reason: `Date ${occurredAt} is in the future` };

    const amountRaw = cells[mapping.amountColumn] ?? '';
    const amountMajor = parseCsvAmount(amountRaw, mapping.decimalStyle);
    if (amountMajor === null) return { rowNumber, status: 'skipped', reason: `Couldn't read an amount from "${amountRaw || '(blank)'}"` };
    if (amountMajor === 0) return { rowNumber, status: 'skipped', reason: 'Amount is zero' };

    let currencyCode = options.defaultCurrencyCode;
    if (mapping.currencyColumn !== null) {
      const raw = (cells[mapping.currencyColumn] ?? '').trim().toUpperCase();
      if (raw) {
        if (!knownCurrencyCodes.has(raw)) {
          return { rowNumber, status: 'skipped', reason: `Unknown currency code "${raw}"` };
        }
        currencyCode = raw;
      }
    }

    const note = mapping.noteColumn !== null ? (cells[mapping.noteColumn] ?? '').trim() : '';
    const categoryName = mapping.categoryColumn !== null ? (cells[mapping.categoryColumn] ?? '').trim() : '';
    // Negative amounts become expenses; positive become income (design's
    // stated rule) — a CSV import never has a separate type column.
    const type: 'expense' | 'income' = amountMajor < 0 ? 'expense' : 'income';

    return {
      rowNumber,
      status: 'ready',
      occurredAt,
      amountMajorAbs: Math.abs(amountMajor),
      currencyCode,
      type,
      note: note || undefined,
      categoryName: categoryName || undefined,
    };
  });
}

export interface CsvImportSummary {
  importedCount: number;
  skippedCount: number;
  newCategoryNames: string[];
  skippedRows: { rowNumber: number; reason: string }[];
}

/** CSV import is a Pro-only feature, grouped with export (docs/MONETIZATION.md). */
export async function importTransactionsFromCsv(
  parsed: CsvParseResult,
  mapping: CsvColumnMapping,
  options: CsvImportOptions,
): Promise<CsvImportSummary> {
  await assertExportAllowed();

  const account = await accountRepository.list().then((accounts) => accounts.find((a) => a.id === options.accountId));
  if (!account) throw new ValidationError(`Unknown account: ${options.accountId}`);

  const results = await evaluateCsvRows(parsed, mapping, options);
  const readyRows = results.filter((r) => r.status === 'ready');

  // Skip exact duplicates of what's already on this account, and of a
  // duplicate elsewhere in the same file — checked once per distinct date
  // seen, not once per row.
  const dates = [...new Set(readyRows.map((r) => r.occurredAt!))];
  const existing = dates.length
    ? await transactionRepository.list({ accountId: options.accountId, from: dates[0], to: dates[dates.length - 1] })
    : [];
  const seenKeys = new Set(
    existing.map((t) => `${t.occurredAt.slice(0, 10)}|${t.amountMinor}|${t.currencyCode}|${t.note ?? ''}`),
  );

  const decimalDigitsByCode = new Map((await getDb().select().from(currencies)).map((c) => [c.code, c.decimalDigits]));
  const categoryCache = new Map<string, Category>();
  for (const c of await categoryRepository.list()) {
    categoryCache.set(`${c.type}:${c.name.toLowerCase()}`, c);
  }
  const newCategoryNames: string[] = [];
  const skippedRows: { rowNumber: number; reason: string }[] = [];
  let importedCount = 0;

  for (const row of results) {
    if (row.status === 'skipped') {
      skippedRows.push({ rowNumber: row.rowNumber, reason: row.reason! });
      continue;
    }

    const decimalDigits = decimalDigitsByCode.get(row.currencyCode!) ?? 2;
    const amountMinor = majorToMinor(row.amountMajorAbs!, decimalDigits);

    const key = `${row.occurredAt}|${amountMinor}|${row.currencyCode}|${row.note ?? ''}`;
    if (seenKeys.has(key)) {
      skippedRows.push({ rowNumber: row.rowNumber, reason: 'Duplicate of an entry already logged' });
      continue;
    }

    let categoryId: string | undefined;
    if (row.categoryName) {
      const cacheKey = `${row.type}:${row.categoryName.toLowerCase()}`;
      let category = categoryCache.get(cacheKey);
      if (!category) {
        category = await categoryRepository.create({
          name: row.categoryName,
          icon: 'pricetag-outline',
          iconType: 'vector',
          color: '#6B7280',
          type: row.type!,
        });
        categoryCache.set(cacheKey, category);
        newCategoryNames.push(row.categoryName);
      }
      categoryId = category.id;
    }

    try {
      await transactionRepository.create({
        accountId: options.accountId,
        type: row.type!,
        amountMinor,
        currencyCode: row.currencyCode!,
        categoryId,
        note: row.note,
        occurredAt: row.occurredAt!,
      });
      seenKeys.add(key);
      importedCount++;
    } catch (e) {
      skippedRows.push({ rowNumber: row.rowNumber, reason: e instanceof Error ? e.message : 'Could not import this row' });
    }
  }

  return { importedCount, skippedCount: skippedRows.length, newCategoryNames, skippedRows };
}

/** Opens the OS document picker and returns the picked file's raw text, or null if cancelled. */
export async function pickCsvFile(): Promise<{ name: string; content: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'text/csv', copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const content = await new File(asset.uri).text();
  return { name: asset.name, content };
}
