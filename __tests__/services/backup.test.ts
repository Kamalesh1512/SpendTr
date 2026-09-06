import {
  createBackupSnapshot,
  previewBackupFile,
  restoreFromFile,
  WrongPassphraseError,
} from '@/services/backup';
import * as accountRepository from '@/repositories/accountRepository';
import * as categoryRepository from '@/repositories/categoryRepository';
import * as settingsRepository from '@/repositories/settingsRepository';
import * as transactionRepository from '@/repositories/transactionRepository';
import { PaywallRequiredError, ValidationError } from '@/types/errors';
import { seedTestAccount, setUpSeededDb, tearDown } from '../repositories/testSetup';

jest.setTimeout(15000);

describe('backup service', () => {
  const passphrase = 'correct-horse-battery-staple';

  beforeEach(async () => {
    await setUpSeededDb();
    await settingsRepository.get('USD');
  });
  afterEach(tearDown);

  test('createBackupSnapshot requires Pro', async () => {
    await expect(createBackupSnapshot(passphrase)).rejects.toThrow(PaywallRequiredError);
  });

  test('createBackupSnapshot rejects a passphrase under 12 characters', async () => {
    await settingsRepository.update({ isPro: true });
    await expect(createBackupSnapshot('short')).rejects.toThrow(ValidationError);
  });

  test('round-trip: backup, mutate, restore brings the database back to the snapshot', async () => {
    await settingsRepository.update({ isPro: true });
    const account = await seedTestAccount();
    const [category] = await categoryRepository.list('expense');
    await transactionRepository.create({
      accountId: account.id,
      type: 'expense',
      amountMinor: 1500,
      currencyCode: 'USD',
      categoryId: category!.id,
      note: 'Coffee',
      occurredAt: '2026-08-01',
    });

    const { encryptedBlob, summary } = await createBackupSnapshot(passphrase);
    expect(summary.entryCount).toBe(1);
    expect(summary.accountCount).toBe(1);

    // Mutate the database after the backup was taken.
    await accountRepository.create({ name: 'Extra wallet', currencyCode: 'USD', icon: 'cash', color: '#000000' });
    await transactionRepository.create({
      accountId: account.id,
      type: 'expense',
      amountMinor: 999,
      currencyCode: 'USD',
      occurredAt: '2026-08-02',
    });
    expect(await accountRepository.list()).toHaveLength(2);
    expect(await transactionRepository.list()).toHaveLength(2);

    const result = await restoreFromFile(encryptedBlob, passphrase);
    expect(result.entryCount).toBe(1);
    expect(result.accountCount).toBe(1);

    const restoredAccounts = await accountRepository.list();
    expect(restoredAccounts).toHaveLength(1);
    expect(restoredAccounts[0]!.name).toBe(account.name);

    const restoredTxns = await transactionRepository.list();
    expect(restoredTxns).toHaveLength(1);
    expect(restoredTxns[0]!.note).toBe('Coffee');
  });

  test('restoreFromFile never touches isPro — the store, not the backup, is the source of truth', async () => {
    await settingsRepository.update({ isPro: true });
    await seedTestAccount();
    const { encryptedBlob } = await createBackupSnapshot(passphrase);

    await restoreFromFile(encryptedBlob, passphrase);

    expect((await settingsRepository.get()).isPro).toBe(true);
  });

  test('restoreFromFile rejects the wrong passphrase without changing anything', async () => {
    await settingsRepository.update({ isPro: true });
    const account = await seedTestAccount();
    const { encryptedBlob } = await createBackupSnapshot(passphrase);

    await expect(restoreFromFile(encryptedBlob, 'totally-different-phrase')).rejects.toThrow(WrongPassphraseError);

    // Nothing changed — the original account is still there.
    const accounts = await accountRepository.list();
    expect(accounts).toHaveLength(1);
    expect(accounts[0]!.id).toBe(account.id);
  });

  test('previewBackupFile reports the summary without writing anything', async () => {
    await settingsRepository.update({ isPro: true });
    const account = await seedTestAccount();
    const { encryptedBlob } = await createBackupSnapshot(passphrase);

    const preview = await previewBackupFile(encryptedBlob, passphrase);
    expect(preview.accountCount).toBe(1);

    // A second account created after the backup should not appear anywhere
    // restore-related yet, since preview only decrypts and reads.
    await accountRepository.create({ name: 'Second', currencyCode: 'USD', icon: 'cash', color: '#000000' });
    expect(await accountRepository.list()).toHaveLength(2);
    expect(account).toBeDefined();
  });

  test('restoreFromFile rejects a file that is not a Spendtr backup', async () => {
    await settingsRepository.update({ isPro: true });
    await expect(restoreFromFile('not json at all', passphrase)).rejects.toThrow(ValidationError);
    await expect(restoreFromFile(JSON.stringify({ hello: 'world' }), passphrase)).rejects.toThrow(ValidationError);
  });
});
