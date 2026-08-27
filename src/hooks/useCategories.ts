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
    refetch();
  }, [refetch]);

  return { categories, loading, refetch };
}
