import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  evaluateCsvRows,
  exportTransactionsCsv,
  exportTransactionsPdf,
  importTransactionsFromCsv,
  parseCsv,
  type CsvColumnMapping,
} from '@/services/export';
import * as categoryRepository from '@/repositories/categoryRepository';
import * as settingsRepository from '@/repositories/settingsRepository';
import * as transactionRepository from '@/repositories/transactionRepository';
import { PaywallRequiredError } from '@/types/errors';
import { seedTestAccount, setUpSeededDb, tearDown } from '../repositories/testSetup';
import type { Account } from '@/repositories/accountRepository';

describe('export service', () => {
  let account: Account;

  beforeEach(async () => {
    await setUpSeededDb();
    await settingsRepository.get('USD');
    account = await seedTestAccount();
    jest.clearAllMocks();
  });
  afterEach(tearDown);

  test('exportTransactionsCsv rejects free-tier users with PaywallRequiredError', async () => {
    await expect(exportTransactionsCsv()).rejects.toThrow(PaywallRequiredError);
  });

  test('exportTransactionsPdf rejects free-tier users with PaywallRequiredError', async () => {
    await expect(exportTransactionsPdf()).rejects.toThrow(PaywallRequiredError);
  });

  test('Pro users can export CSV; rows include amounts formatted per currency decimals', async () => {
    await settingsRepository.update({ isPro: true });
    await transactionRepository.create({
      accountId: account.id,
      type: 'expense',
      amountMinor: 1234,
      currencyCode: 'USD',
      note: 'coffee',
      occurredAt: '2026-08-01',
    });

    const uri = await exportTransactionsCsv();
    expect(uri).toContain('.csv');
    expect(Sharing.isAvailableAsync).toHaveBeenCalled();
    expect(Sharing.shareAsync).toHaveBeenCalledWith(uri, expect.objectContaining({ mimeType: 'text/csv' }));
  });

  test('Pro users can export PDF via expo-print', async () => {
    await settingsRepository.update({ isPro: true });
    await transactionRepository.create({
      accountId: account.id,
      type: 'expense',
      amountMinor: 1500,
      currencyCode: 'JPY',
      occurredAt: '2026-08-01',
    });

    const uri = await exportTransactionsPdf();
    expect(Print.printToFileAsync).toHaveBeenCalledWith(expect.objectContaining({ html: expect.any(String) }));
    expect(uri).toBe('file:///tmp/spendtr.pdf');
  });

  describe('CSV import', () => {
    const mapping: CsvColumnMapping = {
      dateColumn: 0,
      noteColumn: 1,
      amountColumn: 2,
      currencyColumn: 3,
      categoryColumn: 4,
      decimalStyle: 'dot',
    };

    test('parseCsv splits a header row from data rows and handles quoted fields with embedded commas', () => {
      const csv = 'Date,Description,Amount\n2026-08-01,"Coffee, large",-4.50\n2026-08-02,Salary,3000.00\n';
      const parsed = parseCsv(csv);
      expect(parsed.headers).toEqual(['Date', 'Description', 'Amount']);
      expect(parsed.rows).toEqual([
        ['2026-08-01', 'Coffee, large', '-4.50'],
        ['2026-08-02', 'Salary', '3000.00'],
      ]);
    });

    test('evaluateCsvRows flags a bad date, a bad amount, and an unknown currency', async () => {
      const csv = [
        'Date,Note,Amount,Curr,Cat',
        'not-a-date,Coffee,-4.50,USD,Dining',
        '2026-08-05,Bad amount,not-a-number,USD,Dining',
        '2026-08-06,Unknown currency,-4.50,ZZZ,Dining',
        '2026-08-07,Good row,-4.50,USD,Dining',
      ].join('\n');
      const parsed = parseCsv(csv);
      const results = await evaluateCsvRows(parsed, mapping, { accountId: 'irrelevant', defaultCurrencyCode: 'USD' });

      expect(results[0]!.status).toBe('skipped');
      expect(results[1]!.status).toBe('skipped');
      expect(results[2]!.status).toBe('skipped');
      expect(results[3]!.status).toBe('ready');
    });

    test('evaluateCsvRows respects the comma decimal style', async () => {
      const csv = ['Date,Note,Amount,Curr,Cat', '2026-08-05,Rossmann,"-8,4",USD,Care'].join('\n');
      const parsed = parseCsv(csv);
      const commaMapping: CsvColumnMapping = { ...mapping, decimalStyle: 'comma' };
      const results = await evaluateCsvRows(parsed, commaMapping, { accountId: 'irrelevant', defaultCurrencyCode: 'USD' });
      expect(results[0]!.status).toBe('ready');
      expect(results[0]!.amountMajorAbs).toBeCloseTo(8.4);
    });

    test('importTransactionsFromCsv requires Pro', async () => {
      const parsed = parseCsv('Date,Note,Amount,Curr,Cat\n2026-08-05,Coffee,-4.50,USD,Dining\n');
      await expect(
        importTransactionsFromCsv(parsed, mapping, { accountId: account.id, defaultCurrencyCode: 'USD' }),
      ).rejects.toThrow(PaywallRequiredError);
    });

    test('importTransactionsFromCsv imports valid rows, skips bad ones, and creates a missing category', async () => {
      await settingsRepository.update({ isPro: true });
      const csv = [
        'Date,Note,Amount,Curr,Cat',
        '2026-08-05,Coffee,-4.50,USD,Dining Out',
        '2026-08-06,Salary,3000.00,USD,',
        'bad-date,Bad row,-1.00,USD,',
      ].join('\n');
      const parsed = parseCsv(csv);

      const summary = await importTransactionsFromCsv(parsed, mapping, {
        accountId: account.id,
        defaultCurrencyCode: 'USD',
      });

      expect(summary.importedCount).toBe(2);
      expect(summary.skippedCount).toBe(1);
      expect(summary.skippedRows[0]!.reason).toMatch(/date/i);
      expect(summary.newCategoryNames).toEqual(['Dining Out']);

      const created = await categoryRepository.list('expense');
      expect(created.some((c) => c.name === 'Dining Out')).toBe(true);

      const txns = await transactionRepository.list({ accountId: account.id });
      expect(txns).toHaveLength(2);
    });

    test('importTransactionsFromCsv skips an exact duplicate of an existing transaction', async () => {
      await settingsRepository.update({ isPro: true });
      await transactionRepository.create({
        accountId: account.id,
        type: 'expense',
        amountMinor: 450,
        currencyCode: 'USD',
        note: 'Coffee',
        occurredAt: '2026-08-05',
      });

      const parsed = parseCsv('Date,Note,Amount,Curr,Cat\n2026-08-05,Coffee,-4.50,USD,\n');
      const summary = await importTransactionsFromCsv(parsed, mapping, {
        accountId: account.id,
        defaultCurrencyCode: 'USD',
      });

      expect(summary.importedCount).toBe(0);
      expect(summary.skippedRows[0]!.reason).toMatch(/duplicate/i);
    });

    test('importTransactionsFromCsv falls back to defaultCurrencyCode when the currency column is unmapped', async () => {
      await settingsRepository.update({ isPro: true });
      const parsed = parseCsv('Date,Note,Amount,Cat\n2026-08-05,Coffee,-4.50,\n');
      const mappingNoCurrency: CsvColumnMapping = { ...mapping, currencyColumn: null, categoryColumn: null };

      const summary = await importTransactionsFromCsv(parsed, mappingNoCurrency, {
        accountId: account.id,
        defaultCurrencyCode: 'EUR',
      });

      expect(summary.importedCount).toBe(1);
      const [txn] = await transactionRepository.list({ accountId: account.id });
      expect(txn!.currencyCode).toBe('EUR');
    });
  });
});
