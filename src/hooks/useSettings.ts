// Thin data hook over SettingsRepository with a refetch-after-write pattern
// (docs/CODING_STANDARDS.md "State Management" — hooks never cache
// persisted data as their own private source of truth; every write is
// followed by a refetch from SQLite).
//
// The fetched row is held in one module-level store shared by every
// useSettings() call site (useAppColors, the root lock screen, Settings,
// Reports, ...) via useSyncExternalStore, rather than each call site
// keeping its own useState copy. With independent per-instance state, a
// write from one screen (e.g. Settings' theme toggle) only ever updated
// that screen's own copy — every other mounted consumer (crucially
// useAppColors, since it calls useSettings() itself) kept rendering the
// stale value until it happened to remount, which is why switching
// Appearance to Light didn't visibly re-theme the app.
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import * as settingsRepository from '../repositories/settingsRepository';
import type { UserSettings } from '../repositories/settingsRepository';

interface SettingsState {
  settings: UserSettings | null;
  loading: boolean;
}

let state: SettingsState = { settings: null, loading: true };
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setState(patch: Partial<SettingsState>) {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

async function refetch(): Promise<void> {
  if (inFlight) return inFlight;
  setState({ loading: true });
  inFlight = settingsRepository
    .get()
    .then((row) => {
      setState({ settings: row, loading: false });
    })
    .catch((e) => {
      console.error('[useSettings] refetch failed:', e);
      setState({ loading: false });
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): SettingsState {
  return state;
}

export function useSettings() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    refetch();
  }, []);

  const stableRefetch = useCallback(() => refetch(), []);

  return { settings: snapshot.settings, loading: snapshot.loading, refetch: stableRefetch };
}
