import { useCallback, useEffect, useState } from 'react';
import * as subscriptionRepository from '../repositories/subscriptionRepository';
import type { Subscription } from '../repositories/subscriptionRepository';

export function useSubscriptions(activeOnly?: boolean) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const rows = await subscriptionRepository.list(activeOnly);
    setSubscriptions(
      [...rows].sort((a, b) => a.nextRenewalDate.localeCompare(b.nextRenewalDate)),
    );
    setLoading(false);
  }, [activeOnly]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { subscriptions, loading, refetch };
}
