// A screen's 24px title, optionally with one round accent action on the
// right (docs/design_system/components/nav/ScreenHeader.d.ts).
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';

interface ScreenHeaderProps {
  title: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}

export function ScreenHeader({ title, actionIcon, actionLabel, onAction, testID }: ScreenHeaderProps) {
  const { colors, font, space } = useTheme();
  return (
    <View style={[styles.row, { paddingHorizontal: space[20], paddingTop: 2, paddingBottom: space[10], gap: space[8] }]}>
      <Text style={{ fontSize: font.size['3xl'], fontWeight: '700', color: colors.text, flex: 1 }}>{title}</Text>
      {actionIcon ? (
        <Pressable
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          style={styles.actionButton}
        >
          <Ionicons name={actionIcon} size={21} color={colors.accent} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  actionButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
