// Horizontal lockup: SpendTrMark + "SpendTr" wordmark
// (docs/design_system/assets/logo.svg). Self-themed off useTheme() so brand
// and UI can never drift apart — the logo accent and colors.accent are the
// same token.
import { Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { SpendTrMark } from './SpendTrMark';

interface SpendTrLockupProps {
  /** Height of the mark; the wordmark scales from it. */
  markSize?: number;
  tagline?: boolean;
}

export function SpendTrLockup({ markSize = 44, tagline = false }: SpendTrLockupProps) {
  const { colors } = useTheme();
  const wordmarkSize = markSize * 0.68;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: markSize * 0.36 }}>
        <SpendTrMark size={markSize} ink={colors.text} accent={colors.accent} />
        <Text
          style={{
            fontFamily: 'Archivo_800ExtraBold',
            fontSize: wordmarkSize,
            lineHeight: wordmarkSize,
            letterSpacing: wordmarkSize * -0.03,
            color: colors.text,
          }}
        >
          Spend<Text style={{ color: colors.accent }}>Tr</Text>
        </Text>
      </View>
      {tagline && (
        <Text
          style={{
            marginTop: 8,
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: 2,
            color: colors.textMuted,
          }}
        >
          Private. Simple. Yours.
        </Text>
      )}
    </View>
  );
}
