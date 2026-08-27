// `currencies` is bundled reference data with no repository of its own
// (docs/API_DESIGN.md lists five repositories; currencies isn't one —
// docs/DATABASE_SCHEMA.md: "not user-editable in MVP"), so this hook reads
// it the same way src/services/currency.ts does: directly via the DB
// client, since there's no business logic to layer a repository over.
import { useEffect, useState } from 'react';
import { getDb } from '../db/client';
import { currencies } from '../db/schema';

export type Currency = typeof currencies.$inferSelect;

export function useCurrencies() {
  const [list, setList] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getDb()
      .select()
      .from(currencies)
      .then((rows) => {
        if (!cancelled) {
          setList([...rows].sort((a, b) => a.code.localeCompare(b.code)));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { currencies: list, loading };
}
