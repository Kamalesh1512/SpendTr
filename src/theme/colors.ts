// Dark mode is the primary designed theme, with light fully supported
// (docs/UI_UX_GUIDELINES.md "Visual Direction"). Kept as plain objects
// (no styling library) so screens can pick a palette from one place.
export interface Palette {
  background: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  danger: string;
  success: string;
}

export const darkPalette: Palette = {
  background: '#0B0F14',
  surface: '#161B22',
  border: '#2A313C',
  text: '#F2F4F7',
  textMuted: '#9AA4B2',
  primary: '#F97316',
  danger: '#FF6B6B',
  success: '#3DD68C',
};

export const lightPalette: Palette = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  border: '#E3E6EA',
  text: '#111417',
  textMuted: '#5C6672',
  primary: '#C2410C',
  danger: '#D9384A',
  success: '#1E9E63',
};
