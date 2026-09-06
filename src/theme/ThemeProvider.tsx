// The one place accent + dark/light re-theming happens. Per
// docs/design_system/tokens/accent.css: "the app re-themes every control by
// writing ONE declaration at the document root." This is that declaration —
// a React context resolved once from user_settings, consumed everywhere via
// useTheme(). No screen ever picks a color, accent, or category hue itself.
import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors, type ColorRoles } from './colors';
import { resolveAccent, type AccentRoles } from './accent';
import { CATEGORY_COLORS, CATEGORY_GLYPH } from './categories';
import { fontSize, fontWeight, lineHeight, letterSpacing, tabularNums } from './typography';
import { space, gutterScreen, gutterList, gutterModal, listBottomInset, hitMin, tabBarHeight, fabSize } from './spacing';
import { radius, borderWidth, shadow } from './shape';
import { duration, easingCurve, pressScale, pressOpacity } from './motion';
import { useSettings } from '../hooks/useSettings';

export interface Theme {
  isDark: boolean;
  colors: ColorRoles & AccentRoles;
  categoryColors: typeof CATEGORY_COLORS;
  categoryGlyph: string;
  font: {
    size: typeof fontSize;
    weight: typeof fontWeight;
    lineHeight: typeof lineHeight;
    letterSpacing: typeof letterSpacing;
    tabularNums: typeof tabularNums;
  };
  space: typeof space;
  gutter: { screen: number; list: number; modal: number; listBottomInset: number };
  hitMin: number;
  tabBarHeight: number;
  fabSize: number;
  radius: typeof radius;
  borderWidth: typeof borderWidth;
  shadow: typeof shadow;
  motion: {
    duration: typeof duration;
    easing: typeof easingCurve;
    pressScale: number;
    pressOpacity: number;
  };
}

function buildTheme(isDark: boolean, accentColor: string): Theme {
  const base = isDark ? darkColors : lightColors;
  const accent = resolveAccent(accentColor, isDark);
  return {
    isDark,
    colors: { ...base, ...accent },
    categoryColors: CATEGORY_COLORS,
    categoryGlyph: CATEGORY_GLYPH,
    font: { size: fontSize, weight: fontWeight, lineHeight, letterSpacing, tabularNums },
    space,
    gutter: { screen: gutterScreen, list: gutterList, modal: gutterModal, listBottomInset },
    hitMin,
    tabBarHeight,
    fabSize,
    radius,
    borderWidth,
    shadow,
    motion: { duration, easing: easingCurve, pressScale, pressOpacity },
  };
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const { settings } = useSettings();

  const theme = useMemo(() => {
    const themePref = settings?.theme ?? 'system';
    const isDark = themePref === 'system' ? systemScheme !== 'light' : themePref === 'dark';
    const accentColor = settings?.accentColor ?? 'default';
    return buildTheme(isDark, accentColor);
  }, [settings?.theme, settings?.accentColor, systemScheme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/** The only way a screen or component should read colors/spacing/type. */
export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme() called outside <ThemeProvider>. Wrap the app root in app/_layout.tsx.');
  }
  return theme;
}
