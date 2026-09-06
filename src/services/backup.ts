// On-device encrypted backup/restore (docs/API_DESIGN.md §5, Gap #5 fix).
// The OS document picker/share sheet is the entire integration surface —
// no cloud provider SDK is ever linked directly (docs/CLAUDE.md §11). The
// snapshot is encrypted client-side with a key derived from a user-supplied
// passphrase before it ever reaches the file system the user picks
// (docs/SECURITY.md §5): Argon2id (RFC 9106) for key derivation, AES-256-GCM
// for authenticated encryption — both from @noble/hashes and @noble/ciphers,
// audited, actively maintained, pure-JS (no native module / no polyfill for
// Web Crypto needed, since randomness comes from expo-crypto directly).
//
// Restore is a full replace, not a merge (docs/design_system/templates/
// spendtr-app/data-mgmt.jsx RestoreScreen: "Restoring overwrites the ...
// entries already on this phone" / "This replaces everything ... It cannot
// be undone.") — API_DESIGN.md §5 left replace-vs-merge unresolved
// (docs/USER_FLOWS.md Flow 14 doesn't say either), so the design's explicit
// copy is what's implemented.
import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Directory, File, Paths } from 'expo-file-system';
import { argon2idAsync } from '@noble/hashes/argon2.js';
import { gcm } from '@noble/ciphers/aes.js';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { getDb } from '../db/client';
import {
  accounts,
  budgetCategoryLimits,
  budgets,
  categories,
  debtPayments,
  debts,
  goalContributions,
  goals,
  recurringTransactions,
  transactionSplits,
  transactions,
  userSettings,
} from '../db/schema';
import * as settingsRepository from '../repositories/settingsRepository';
import { PaywallRequiredError, ValidationError } from '../types/errors';

/** Backup/restore is a Pro-only feature (docs/MONETIZATION.md "Backup and restore to any storage provider"). */
async function assertBackupAllowed(): Promise<void> {
  const settings = await settingsRepository.get();
  if (!settings.isPro) {
    throw new PaywallRequiredError('backup', 'Encrypted backup and restore requires Pro.');
  }
}

const MAGIC = 'spendtr-backup';
const SCHEMA_VERSION = 1;
// Deliberately light for a pure-JS KDF running on a phone: this is
// @noble/hashes' JS implementation (no native/WASM acceleration), and
// RFC 9106's usual "second recommended" profile (19 MiB, t=2) measured
// multiple seconds per call in an equivalent JS environment during
// development — unacceptable for something the user waits on twice
// (backup, then restore). 1 MiB / t=3 is still a real memory-hard KDF, far
// stronger than an unsalted hash or a handful of PBKDF2 rounds, chosen to
// keep the passphrase step under ~1s rather than to hit a textbook target.
const ARGON2_OPTS = { t: 3, m: 1024, p: 1, dkLen: 32 };
const SALT_BYTES = 16;
const NONCE_BYTES = 12;

interface BackupTables {
  accounts: (typeof accounts.$inferSelect)[];
  categories: (typeof categories.$inferSelect)[];
  recurringTransactions: (typeof recurringTransactions.$inferSelect)[];
  transactions: (typeof transactions.$inferSelect)[];
  transactionSplits: (typeof transactionSplits.$inferSelect)[];
  budgets: (typeof budgets.$inferSelect)[];
  budgetCategoryLimits: (typeof budgetCategoryLimits.$inferSelect)[];
  goals: (typeof goals.$inferSelect)[];
  goalContributions: (typeof goalContributions.$inferSelect)[];
  debts: (typeof debts.$inferSelect)[];
  debtPayments: (typeof debtPayments.$inferSelect)[];
  /** isPro is deliberately excluded — RevenueCat/the store is always the source of truth for entitlement, never a backup file. */
  userSettings: Omit<typeof userSettings.$inferSelect, 'id' | 'isPro'> | null;
}

interface BackupSnapshot {
  magic: typeof MAGIC;
  schemaVersion: typeof SCHEMA_VERSION;
  createdAt: string;
  tables: BackupTables;
}

interface BackupEnvelope {
  app: typeof MAGIC;
  envelopeVersion: 1;
  kdf: { algorithm: 'argon2id'; salt: string; t: number; m: number; p: number };
  cipher: { algorithm: 'aes-256-gcm'; nonce: string };
  ciphertext: string;
}

export interface BackupSummary {
  entryCount: number;
  accountCount: number;
}

/** Live counts for the Backup screen's top row — cheap, no encryption. */
export async function getBackupPreviewCounts(): Promise<BackupSummary> {
  await assertBackupAllowed();
  const db = getDb();
  const [txns, accts] = await Promise.all([db.select().from(transactions), db.select().from(accounts)]);
  return { entryCount: txns.length, accountCount: accts.length };
}

/**
 * A local "recent backups" cache — every backup this device has created
 * through writeBackupToUserLocation is also kept here so Restore can offer
 * a "Found on this device" list without needing broad filesystem-scan
 * permissions. Backups saved to Drive/iCloud/a USB drive by the user still
 * only live where they put them; this is a convenience for the common case
 * of restoring on the same phone that made the backup.
 */
const LOCAL_BACKUPS_DIR_NAME = 'spendtr-backups';

function localBackupsDir(): Directory {
  const dir = new Directory(Paths.document, LOCAL_BACKUPS_DIR_NAME);
  if (!dir.exists) dir.create();
  return dir;
}

export interface LocalBackupFile {
  name: string;
  content: string;
  sizeBytes: number;
}

/** Backup files this device has previously created, most recent first. */
export function listLocalBackups(): LocalBackupFile[] {
  const dir = localBackupsDir();
  return dir
    .list()
    .filter((entry): entry is File => entry instanceof File && entry.name.endsWith('.stbak'))
    .map((file) => ({ name: file.name, content: '', sizeBytes: file.size ?? 0 }))
    .sort((a, b) => b.name.localeCompare(a.name));
}

export async function readLocalBackup(name: string): Promise<string> {
  const file = new File(localBackupsDir(), name);
  return file.text();
}

function randomBytes(length: number): Uint8Array {
  return Crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Minimal UTF-8 decoder — `TextDecoder` availability is inconsistent across
 * Hermes/RN versions, so this avoids depending on it for something as
 * central as reading the decrypted snapshot back.
 */
function bytesToUtf8(bytes: Uint8Array): string {
  let result = '';
  let i = 0;
  while (i < bytes.length) {
    const byte1 = bytes[i++]!;
    if (byte1 < 0x80) {
      result += String.fromCharCode(byte1);
    } else if (byte1 >= 0xc0 && byte1 < 0xe0) {
      const byte2 = bytes[i++]!;
      result += String.fromCharCode(((byte1 & 0x1f) << 6) | (byte2 & 0x3f));
    } else if (byte1 >= 0xe0 && byte1 < 0xf0) {
      const byte2 = bytes[i++]!;
      const byte3 = bytes[i++]!;
      result += String.fromCharCode(((byte1 & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f));
    } else {
      const byte2 = bytes[i++]!;
      const byte3 = bytes[i++]!;
      const byte4 = bytes[i++]!;
      const codepoint = (((byte1 & 0x07) << 18) | ((byte2 & 0x3f) << 12) | ((byte3 & 0x3f) << 6) | (byte4 & 0x3f)) - 0x10000;
      result += String.fromCharCode(0xd800 + (codepoint >> 10), 0xdc00 + (codepoint & 0x3ff));
    }
  }
  return result;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<Uint8Array> {
  return argon2idAsync(passphrase, salt, ARGON2_OPTS);
}

async function readTables(): Promise<BackupTables> {
  const db = getDb();
  const [settings] = await db.select().from(userSettings).limit(1);
  const { id: _id, isPro: _isPro, ...restSettings } = settings ?? ({} as typeof userSettings.$inferSelect);

  return {
    accounts: await db.select().from(accounts),
    categories: await db.select().from(categories),
    recurringTransactions: await db.select().from(recurringTransactions),
    transactions: await db.select().from(transactions),
    transactionSplits: await db.select().from(transactionSplits),
    budgets: await db.select().from(budgets),
    budgetCategoryLimits: await db.select().from(budgetCategoryLimits),
    goals: await db.select().from(goals),
    goalContributions: await db.select().from(goalContributions),
    debts: await db.select().from(debts),
    debtPayments: await db.select().from(debtPayments),
    userSettings: settings ? (restSettings as BackupTables['userSettings']) : null,
  };
}

export async function createBackupSnapshot(
  passphrase: string,
): Promise<{ encryptedBlob: string; filename: string; summary: BackupSummary }> {
  await assertBackupAllowed();
  if (passphrase.length < 12) {
    throw new ValidationError('Passphrase must be at least 12 characters.');
  }

  const tables = await readTables();
  const snapshot: BackupSnapshot = {
    magic: MAGIC,
    schemaVersion: SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    tables,
  };

  const salt = randomBytes(SALT_BYTES);
  const nonce = randomBytes(NONCE_BYTES);
  const key = await deriveKey(passphrase, salt);
  const plaintext = utf8ToBytes(JSON.stringify(snapshot));
  const ciphertext = gcm(key, nonce).encrypt(plaintext);

  const envelope: BackupEnvelope = {
    app: MAGIC,
    envelopeVersion: 1,
    kdf: { algorithm: 'argon2id', salt: bytesToHex(salt), t: ARGON2_OPTS.t, m: ARGON2_OPTS.m, p: ARGON2_OPTS.p },
    cipher: { algorithm: 'aes-256-gcm', nonce: bytesToHex(nonce) },
    ciphertext: bytesToHex(ciphertext),
  };

  const dateStamp = snapshot.createdAt.slice(0, 10);
  return {
    encryptedBlob: JSON.stringify(envelope),
    filename: `spendtr-${dateStamp}.stbak`,
    summary: { entryCount: tables.transactions.length, accountCount: tables.accounts.length },
  };
}

/** Hands the encrypted file to the OS share sheet — the user picks Drive, iCloud, Dropbox, a local folder, or anything else already on the device. Spendtr never talks to any of those providers directly. Also keeps a copy in the local "recent backups" cache (see listLocalBackups). */
export async function writeBackupToUserLocation(blob: string, filename: string): Promise<void> {
  const file = new File(Paths.cache, filename);
  file.create();
  file.write(blob);

  const localFile = new File(localBackupsDir(), filename);
  localFile.create();
  localFile.write(blob);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'application/octet-stream', dialogTitle: 'Save Spendtr backup' });
  }
}

/** Opens the OS document picker (Open) and returns the picked file's raw text, or null if cancelled. */
export async function pickBackupFile(): Promise<{ name: string; content: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const content = await new File(asset.uri).text();
  return { name: asset.name, content };
}

class WrongPassphraseError extends Error {
  constructor() {
    super("That passphrase doesn't open this file. Nothing has been changed.");
    this.name = 'WrongPassphraseError';
  }
}

export { WrongPassphraseError };

async function decryptSnapshot(fileContent: string, passphrase: string): Promise<BackupSnapshot> {
  let envelope: BackupEnvelope;
  try {
    envelope = JSON.parse(fileContent);
  } catch {
    throw new ValidationError('This file is not a Spendtr backup.');
  }
  if (envelope.app !== MAGIC || !envelope.kdf || !envelope.cipher || !envelope.ciphertext) {
    throw new ValidationError('This file is not a Spendtr backup.');
  }

  const salt = hexToBytes(envelope.kdf.salt);
  const nonce = hexToBytes(envelope.cipher.nonce);
  const key = await deriveKey(passphrase, salt);

  let plaintext: Uint8Array;
  try {
    plaintext = gcm(key, nonce).decrypt(hexToBytes(envelope.ciphertext));
  } catch {
    // AES-GCM's auth tag fails to verify under the wrong key — this is the
    // expected, ordinary "wrong passphrase" path, not a corrupt-file bug.
    throw new WrongPassphraseError();
  }

  let snapshot: BackupSnapshot;
  try {
    snapshot = JSON.parse(bytesToUtf8(plaintext));
  } catch {
    throw new WrongPassphraseError();
  }
  if (snapshot.magic !== MAGIC) throw new WrongPassphraseError();
  return snapshot;
}

/** Decrypts and parses without writing anything — used by the Restore screen to show a summary before the user confirms the destructive replace. */
export async function previewBackupFile(fileContent: string, passphrase: string): Promise<BackupSummary> {
  await assertBackupAllowed();
  const snapshot = await decryptSnapshot(fileContent, passphrase);
  return { entryCount: snapshot.tables.transactions.length, accountCount: snapshot.tables.accounts.length };
}

/** Chunk size for restore inserts — keeps well under SQLite's default bound-parameter ceiling for wide rows. */
const INSERT_CHUNK_SIZE = 200;

async function insertChunked<T extends Record<string, unknown>>(
  table: Parameters<ReturnType<typeof getDb>['insert']>[0],
  rows: T[],
): Promise<void> {
  const db = getDb();
  for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + INSERT_CHUNK_SIZE);
    if (chunk.length > 0) await db.insert(table).values(chunk as never);
  }
}

/**
 * Full replace (see file header): every table this backup covers is
 * cleared, then the snapshot's rows are inserted back in FK-dependency
 * order. `isPro` is never touched — reconciled from RevenueCat separately,
 * never from a backup file.
 */
export async function restoreFromFile(fileContent: string, passphrase: string): Promise<BackupSummary> {
  await assertBackupAllowed();
  const snapshot = await decryptSnapshot(fileContent, passphrase);
  const db = getDb();
  const t = snapshot.tables;

  // Children before parents.
  await db.delete(debtPayments);
  await db.delete(debts);
  await db.delete(goalContributions);
  await db.delete(goals);
  await db.delete(budgetCategoryLimits);
  await db.delete(budgets);
  await db.delete(transactionSplits);
  await db.delete(transactions);
  await db.delete(recurringTransactions);
  await db.delete(categories);
  await db.delete(accounts);

  // Parents before children.
  await insertChunked(accounts, t.accounts);
  await insertChunked(categories, t.categories);
  await insertChunked(recurringTransactions, t.recurringTransactions);
  await insertChunked(transactions, t.transactions);
  await insertChunked(transactionSplits, t.transactionSplits);
  await insertChunked(budgets, t.budgets);
  await insertChunked(budgetCategoryLimits, t.budgetCategoryLimits);
  await insertChunked(goals, t.goals);
  await insertChunked(goalContributions, t.goalContributions);
  await insertChunked(debts, t.debts);
  await insertChunked(debtPayments, t.debtPayments);

  if (t.userSettings) {
    const current = await settingsRepository.get();
    await settingsRepository.update({
      baseCurrencyCode: t.userSettings.baseCurrencyCode,
      biometricLockEnabled: t.userSettings.biometricLockEnabled,
      theme: t.userSettings.theme,
      accentColor: t.userSettings.accentColor,
      notificationsEnabled: t.userSettings.notificationsEnabled,
      onboardingComplete: t.userSettings.onboardingComplete,
      hideAmountsInSwitcher: t.userSettings.hideAmountsInSwitcher,
      proRestoreLinked: current.proRestoreLinked,
    });
  }

  return { entryCount: t.transactions.length, accountCount: t.accounts.length };
}
