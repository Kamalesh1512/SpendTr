import { useCallback, useEffect, useState } from 'react';
import * as transactionRepository from '../repositories/transactionRepository';
import type { Transaction } from '../repositories/transactionRepository';

export interface TransactionFilters {
  from?: string;
  to?: string;
  accountId?: string;
  categoryId?: string;
  type?: 'expense' | 'income';
  search?: string;
}

export function useTransactions(filters?: TransactionFilters) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const rows = await transactionRepository.list(filters);
    setTransactions(rows);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters?.from, filters?.to, filters?.accountId, filters?.categoryId, filters?.type, filters?.search]);

  useEffect(() => {
    // Fetch-on-mount: refetch's first statement (setLoading(true)) runs
    // synchronously here, which is the documented "refetch-after-write"
    // pattern this codebase uses throughout (docs/CODING_STANDARDS.md
    // "State Management") — loading already starts true via useState, so
    // this doesn't cause an extra visible render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, [refetch]);

  return { transactions, loading, refetch };
}

export function useMonthlySummary(month: string) {
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof transactionRepository.getMonthlySummary>> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const result = await transactionRepository.getMonthlySummary(month);
    setSummary(result);
    setLoading(false);
  }, [month]);

  useEffect(() => {
    // Fetch-on-mount: refetch's first statement (setLoading(true)) runs
    // synchronously here, which is the documented "refetch-after-write"
    // pattern this codebase uses throughout (docs/CODING_STANDARDS.md
    // "State Management") — loading already starts true via useState, so
    // this doesn't cause an extra visible render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, [refetch]);

  return { summary, loading, refetch };
}
