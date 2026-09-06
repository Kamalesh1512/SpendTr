import { useCallback, useEffect, useState } from 'react';
import * as recurringTransactionRepository from '../repositories/recurringTransactionRepository';
import type { RecurringTransaction } from '../repositories/recurringTransactionRepository';

export function useRecurringTransactions(activeOnly?: boolean, kind?: 'subscription' | 'bill' | 'income') {
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const rows = await recurringTransactionRepository.list(activeOnly, kind);
    setRecurringTransactions(
      [...rows].sort((a, b) => a.nextRenewalDate.localeCompare(b.nextRenewalDate)),
    );
    setLoading(false);
  }, [activeOnly, kind]);

  useEffect(() => {
    // Fetch-on-mount: refetch's first statement (setLoading(true)) runs
    // synchronously here, which is the documented "refetch-after-write"
    // pattern this codebase uses throughout (docs/CODING_STANDARDS.md
    // "State Management") — loading already starts true via useState, so
    // this doesn't cause an extra visible render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, [refetch]);

  return { recurringTransactions, loading, refetch };
}
