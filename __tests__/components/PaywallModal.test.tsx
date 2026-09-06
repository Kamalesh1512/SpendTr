// docs/TESTING_STRATEGY.md §2: "Paywall modal: purchase success/failure/
// cancel paths (mock RevenueCat)." Mocks @/services/purchases directly
// (the component's actual dependency boundary) rather than the RevenueCat
// SDK, since the service layer's own SDK-integration behavior is already
// covered by __tests__/services/purchases.test.ts.
//
// Uses render()'s own returned queries rather than the RNTL `screen`
// singleton, since `screen` is unbound until render() commits and
// re-cleared by RNTL's auto afterEach(cleanup) — the instance-bound
// queries returned by render() don't depend on that global's timing.
//
// PaywallModal now renders through useTheme()/<ThemeProvider>, which reads
// user_settings — so every render() here needs a seeded test DB
// underneath, same as the repository tests (__tests__/repositories/
// testSetup.ts), plus the provider itself as a wrapper.
import type { ReactElement } from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as purchases from '@/services/purchases';
import { PaywallModal } from '@/components/PaywallModal';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { createTestDb, teardownTestDb } from '../helpers/testDb';
import { runSeed } from '@/db/seed';

jest.mock('@/services/purchases');

const mockedPurchases = jest.mocked(purchases);

function makePackage(priceString = '$24.99') {
  return {
    identifier: 'pro_lifetime',
    product: { priceString },
  } as unknown as Parameters<typeof purchases.purchasePro>[0];
}

function renderPaywall(element: ReactElement) {
  return render(<ThemeProvider>{element}</ThemeProvider>);
}

describe('PaywallModal', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    const db = createTestDb();
    await runSeed(db);
  });

  afterEach(teardownTestDb);

  test('shows the live localized price from the fetched offering', async () => {
    mockedPurchases.getOfferings.mockResolvedValue({
      current: { availablePackages: [makePackage('€22.99')] },
    } as unknown as Awaited<ReturnType<typeof purchases.getOfferings>>);

    const { findByText } = await renderPaywall(<PaywallModal onPurchased={jest.fn()} onClose={jest.fn()} />);

    expect(await findByText('€22.99')).toBeTruthy();
  });

  test('shows "pricing unavailable" and disables purchase when no package is offered', async () => {
    mockedPurchases.getOfferings.mockResolvedValue({
      current: null,
    } as unknown as Awaited<ReturnType<typeof purchases.getOfferings>>);

    const { findByText, getByRole } = await renderPaywall(
      <PaywallModal onPurchased={jest.fn()} onClose={jest.fn()} />,
    );

    expect(await findByText('Pricing unavailable right now')).toBeTruthy();
    expect(getByRole('button', { name: 'Unlock Pro' })).toBeDisabled();
  });

  test('purchase success calls onPurchased', async () => {
    mockedPurchases.getOfferings.mockResolvedValue({
      current: { availablePackages: [makePackage()] },
    } as unknown as Awaited<ReturnType<typeof purchases.getOfferings>>);
    mockedPurchases.purchasePro.mockResolvedValue(true);
    const onPurchased = jest.fn();

    const { findByText, getByRole } = await renderPaywall(
      <PaywallModal onPurchased={onPurchased} onClose={jest.fn()} />,
    );
    await findByText('$24.99');

    fireEvent.press(getByRole('button', { name: 'Unlock Pro — $24.99' }));

    await waitFor(() => expect(onPurchased).toHaveBeenCalled());
  });

  test('purchase failure shows an error message and does not call onPurchased', async () => {
    mockedPurchases.getOfferings.mockResolvedValue({
      current: { availablePackages: [makePackage()] },
    } as unknown as Awaited<ReturnType<typeof purchases.getOfferings>>);
    mockedPurchases.purchasePro.mockRejectedValue(new Error('Network error'));
    const onPurchased = jest.fn();

    const { findByText, getByRole } = await renderPaywall(
      <PaywallModal onPurchased={onPurchased} onClose={jest.fn()} />,
    );
    await findByText('$24.99');

    fireEvent.press(getByRole('button', { name: 'Unlock Pro — $24.99' }));

    expect(await findByText('Network error')).toBeTruthy();
    expect(onPurchased).not.toHaveBeenCalled();
  });

  test('user cancelling the purchase sheet shows no error', async () => {
    mockedPurchases.getOfferings.mockResolvedValue({
      current: { availablePackages: [makePackage()] },
    } as unknown as Awaited<ReturnType<typeof purchases.getOfferings>>);
    const cancelError = Object.assign(new Error('cancelled'), { userCancelled: true });
    mockedPurchases.purchasePro.mockRejectedValue(cancelError);
    const onPurchased = jest.fn();

    const { findByText, getByRole, queryByText } = await renderPaywall(
      <PaywallModal onPurchased={onPurchased} onClose={jest.fn()} />,
    );
    await findByText('$24.99');

    fireEvent.press(getByRole('button', { name: 'Unlock Pro — $24.99' }));

    await waitFor(() => expect(mockedPurchases.purchasePro).toHaveBeenCalled());
    expect(onPurchased).not.toHaveBeenCalled();
    expect(queryByText('cancelled')).toBeNull();
  });

  test('restore purchases success calls onPurchased', async () => {
    mockedPurchases.getOfferings.mockResolvedValue({
      current: { availablePackages: [makePackage()] },
    } as unknown as Awaited<ReturnType<typeof purchases.getOfferings>>);
    mockedPurchases.restorePurchases.mockResolvedValue(true);
    const onPurchased = jest.fn();

    const { findByText, getByRole } = await renderPaywall(
      <PaywallModal onPurchased={onPurchased} onClose={jest.fn()} />,
    );
    await findByText('$24.99');

    fireEvent.press(getByRole('button', { name: 'Restore Purchases' }));

    await waitFor(() => expect(onPurchased).toHaveBeenCalled());
  });

  test('restore with nothing to restore shows a message, not an error state', async () => {
    mockedPurchases.getOfferings.mockResolvedValue({
      current: { availablePackages: [makePackage()] },
    } as unknown as Awaited<ReturnType<typeof purchases.getOfferings>>);
    mockedPurchases.restorePurchases.mockResolvedValue(false);
    const onPurchased = jest.fn();

    const { findByText, getByRole } = await renderPaywall(
      <PaywallModal onPurchased={onPurchased} onClose={jest.fn()} />,
    );
    await findByText('$24.99');

    fireEvent.press(getByRole('button', { name: 'Restore Purchases' }));

    expect(await findByText('No previous purchase found for this account.')).toBeTruthy();
    expect(onPurchased).not.toHaveBeenCalled();
  });

  test('shows the contextual reason copy when a reason is given', async () => {
    mockedPurchases.getOfferings.mockResolvedValue({
      current: { availablePackages: [makePackage()] },
    } as unknown as Awaited<ReturnType<typeof purchases.getOfferings>>);

    const { findByText } = await renderPaywall(
      <PaywallModal reason="export" onPurchased={jest.fn()} onClose={jest.fn()} />,
    );

    expect(await findByText('Exporting your data is a Pro feature. Pro removes every limit below, once.')).toBeTruthy();
  });

  test('close button calls onClose', async () => {
    mockedPurchases.getOfferings.mockResolvedValue({
      current: { availablePackages: [makePackage()] },
    } as unknown as Awaited<ReturnType<typeof purchases.getOfferings>>);
    const onClose = jest.fn();

    const { findByText, getByRole } = await renderPaywall(
      <PaywallModal onPurchased={jest.fn()} onClose={onClose} />,
    );
    await findByText('$24.99');

    fireEvent.press(getByRole('button', { name: 'Not now' }));

    expect(onClose).toHaveBeenCalled();
  });
});
