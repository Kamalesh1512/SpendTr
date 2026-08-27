// Thin data hook over SettingsRepository with a manual refetch pattern
// (docs/CODING_STANDARDS.md "State Management" — Zustand/hooks never cache
// persisted data as source of truth; components refetch after a write).
import { useCallback, useEffect, useState } from 'react';
import * as settingsRepository from '../repositories/settingsRepository';
import type { UserSettings } from '../repositories/settingsRepository';

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const row = await settingsRepository.get();
    setSettings(row);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { settings, loading, refetch };
}
