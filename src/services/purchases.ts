// RevenueCat wrapper (docs/API_DESIGN.md §3, docs/THIRD_PARTY_INTEGRATIONS.md
// §2). One non-consumable product, entitlement id `pro` (docs/MONETIZATION.md
// "RevenueCat Configuration"). RevenueCat/store state is always the source
// of truth; user_settings.is_pro is a local cache reconciled here.
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import Purchases, { LOG_LEVEL, type CustomerInfo, type PurchasesOfferings, type PurchasesPackage } from 'react-native-purchases';
import * as settingsRepository from '../repositories/settingsRepository';
import { ValidationError } from '../types/errors';

const PRO_ENTITLEMENT_ID = 'pro';

let configured = false;

export function configurePurchases(): void {
  if (configured) return;
  const apiKey =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
  if (!apiKey) return; // Not configured yet (e.g. local dev before dashboard setup) — purchase/restore simply unavailable.

  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey });
  configured = true;
}

function isProEntitlementActive(customerInfo: CustomerInfo): boolean {
  return customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined;
}

/** Call on every app start (docs/API_DESIGN.md §3) to reconcile the local cache with the store. */
export async function reconcileProEntitlement(): Promise<boolean> {
  if (!configured) return (await settingsRepository.get()).isPro;
  const customerInfo = await Purchases.getCustomerInfo();
  const isPro = isProEntitlementActive(customerInfo);
  await settingsRepository.update({ isPro });
  return isPro;
}

export async function getOfferings(): Promise<PurchasesOfferings> {
  if (!configured) throw new ValidationError('Purchases is not configured (missing RevenueCat API key).');
  return Purchases.getOfferings();
}

export async function purchasePro(pkg: PurchasesPackage): Promise<boolean> {
  if (!configured) throw new ValidationError('Purchases is not configured (missing RevenueCat API key).');
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  const isPro = isProEntitlementActive(customerInfo);
  await settingsRepository.update({ isPro });
  return isPro;
}

export async function restorePurchases(): Promise<boolean> {
  if (!configured) throw new ValidationError('Purchases is not configured (missing RevenueCat API key).');
  const customerInfo = await Purchases.restorePurchases();
  const isPro = isProEntitlementActive(customerInfo);
  await settingsRepository.update({ isPro });
  return isPro;
}

/**
 * Client-side hash — the raw email never leaves the device
 * (docs/SECURITY.md, docs/CLAUDE.md §11). Normalized first so the same
 * address always hashes identically regardless of case/whitespace.
 */
async function hashEmail(email: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, email.trim().toLowerCase());
}

/**
 * Cross-platform Pro continuity (docs/API_DESIGN.md §4, Gap #4 fix): links
 * this RevenueCat identity to a hashed email so a Pro purchase made on one
 * store resolves on the same email entered on the other platform's install.
 * No Spendtr backend is involved — RevenueCat's own hosted identity
 * resolution does the work. `proRestoreLinked` just remembers that this
 * device has gone through the opt-in once, for the Settings UI.
 */
export async function linkProToEmail(email: string): Promise<boolean> {
  if (!configured) throw new ValidationError('Purchases is not configured (missing RevenueCat API key).');
  const hashedEmail = await hashEmail(email);
  const { customerInfo } = await Purchases.logIn(hashedEmail);
  const isPro = isProEntitlementActive(customerInfo);
  await settingsRepository.update({ isPro, proRestoreLinked: true });
  return isPro;
}
