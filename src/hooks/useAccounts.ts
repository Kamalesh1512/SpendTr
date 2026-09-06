import { useCallback, useEffect, useState } from 'react';
import * as accountRepository from '../repositories/accountRepository';
import type { Account } from '../repositories/accountRepository';

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const rows = await accountRepository.list();
    setAccounts(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Fetch-on-mount: refetch's first statement (setLoading(true)) runs
    // synchronously here, which is the documented "refetch-after-write"
    // pattern this codebase uses throughout (docs/CODING_STANDARDS.md
    // "State Management") — loading already starts true via useState, so
    // this doesn't cause an extra visible render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, [refetch]);

  return { accounts, loading, refetch };
}
