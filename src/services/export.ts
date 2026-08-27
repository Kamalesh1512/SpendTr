// On-device CSV/PDF export (docs/API_DESIGN.md, docs/USER_FLOWS.md Flow 7).
// Runs entirely on-device, no network call, hands off via the OS share
// sheet — this is the app's data-portability/no-lock-in mechanism.
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { getDb } from '../db/client';
import { currencies } from '../db/schema';
import * as categoryRepository from '../repositories/categoryRepository';
import * as settingsRepository from '../repositories/settingsRepository';
import * as transactionRepository from '../repositories/transactionRepository';
import type { Transaction } from '../repositories/transactionRepository';
import { PaywallRequiredError } from '../types/errors';
import { minorToMajor } from '../utils/money';

/** Export is a Pro-only feature (docs/MONETIZATION.md). */
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
