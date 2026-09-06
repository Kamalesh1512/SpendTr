import { useCallback, useEffect, useState } from 'react';
import * as goalRepository from '../repositories/goalRepository';
import type { Goal } from '../repositories/goalRepository';

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const rows = await goalRepository.list();
    setGoals(rows);
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

  return { goals, loading, refetch };
}
