import { useCallback, useEffect, useState } from 'react';
import * as debtRepository from '../repositories/debtRepository';
import type { Debt } from '../repositories/debtRepository';

export function useDebts(includeSettled = false) {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const rows = await debtRepository.list(includeSettled);
    setDebts(rows);
    setLoading(false);
  }, [includeSettled]);

  useEffect(() => {
    // Fetch-on-mount: refetch's first statement (setLoading(true)) runs
    // synchronously here, which is the documented "refetch-after-write"
    // pattern this codebase uses throughout (docs/CODING_STANDARDS.md
    // "State Management") — loading already starts true via useState, so
    // this doesn't cause an extra visible render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, [refetch]);

  return { debts, loading, refetch };
}
