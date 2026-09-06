// Every list screen needs a designed empty state, never a bare "No data"
// (docs/design_system/components/core/EmptyState.d.ts). Uses a muted
// Ionicons glyph in a flat circle — never an illustration
// (docs/design_system/readme.md "Backgrounds and imagery").
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, message, icon = 'file-tray-outline', actionLabel, onAction }: EmptyStateProps) {
  const { colors, space, font } = useTheme();
  return (
    <View style={[styles.container, { paddingVertical: space[48], paddingHorizontal: space[24] }]}>
      <View style={[styles.iconCircle, { backgroundColor: colors.surfaceRaised }]}>
        <Ionicons name={icon} size={26} color={colors.textMuted} />
      </View>
      <Text style={[styles.title, { color: colors.text, fontSize: font.size.lg, marginTop: space[16] }]}>
        {title}
      </Text>
      <Text
        style={[
          styles.message,
          { color: colors.textMuted, fontSize: font.size.bodySm, marginTop: space[6], marginBottom: space[20] },
        ]}
      >
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Button size="sm" onPress={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '600', textAlign: 'center' },
  message: { textAlign: 'center', lineHeight: 20 },
});
