import { useCallback, useEffect, useState } from 'react';
import * as categoryRepository from '../repositories/categoryRepository';
import type { Category } from '../repositories/categoryRepository';

export function useCategories(type?: 'expense' | 'income') {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const rows = await categoryRepository.list(type);
    setCategories(rows);
    setLoading(false);
  }, [type]);

  useEffect(() => {
    // Fetch-on-mount: refetch's first statement (setLoading(true)) runs
    // synchronously here, which is the documented "refetch-after-write"
    // pattern this codebase uses throughout (docs/CODING_STANDARDS.md
    // "State Management") — loading already starts true via useState, so
    // this doesn't cause an extra visible render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, [refetch]);

  return { categories, loading, refetch };
}
