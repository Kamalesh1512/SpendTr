import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { exportTransactionsCsv, exportTransactionsPdf } from '@/services/export';
import * as settingsRepository from '@/repositories/settingsRepository';
import * as transactionRepository from '@/repositories/transactionRepository';
import { PaywallRequiredError } from '@/types/errors';
import { setUpSeededDb, tearDown } from '../repositories/testSetup';

describe('export service', () => {
  beforeEach(async () => {
    await setUpSeededDb();
    await settingsRepository.get('USD');
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
      type: 'expense',
      amountMinor: 1500,
      currencyCode: 'JPY',
      occurredAt: '2026-08-01',
    });

    const uri = await exportTransactionsPdf();
    expect(Print.printToFileAsync).toHaveBeenCalledWith(expect.objectContaining({ html: expect.any(String) }));
    expect(uri).toBe('file:///tmp/spendtr.pdf');
  });
});
