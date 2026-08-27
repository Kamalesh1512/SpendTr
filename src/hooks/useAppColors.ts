import { useColorScheme } from 'react-native';
import { darkPalette, lightPalette, type Palette } from '../theme/colors';
import { useSettings } from './useSettings';

/** Resolves user_settings.theme ('system'|'light'|'dark') against the OS scheme. */
export function useAppColors(): Palette {
  const systemScheme = useColorScheme();
  const { settings } = useSettings();
  const theme = settings?.theme ?? 'system';
  const resolved = theme === 'system' ? (systemScheme ?? 'dark') : theme;
  return resolved === 'light' ? lightPalette : darkPalette;
}
