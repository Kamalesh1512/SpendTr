import { useCallback, useEffect, useState } from 'react';
import * as transactionRepository from '../repositories/transactionRepository';
import type { Transaction } from '../repositories/transactionRepository';

export interface TransactionFilters {
  from?: string;
  to?: string;
  categoryId?: string;
  type?: 'expense' | 'income';
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
  }, [filters?.from, filters?.to, filters?.categoryId, filters?.type]);

  useEffect(() => {
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
    refetch();
  }, [refetch]);

  return { summary, loading, refetch };
}
