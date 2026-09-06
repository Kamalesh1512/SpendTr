// Loading placeholders (promoted from docs/design_system/templates/
// spendtr-app/kit.jsx `Skeleton`/`SkeletonRows`). Every SQLite-reading
// screen handles loading/empty/populated explicitly
// (docs/CODING_STANDARDS.md "Loading States").
import { StyleSheet, View, type DimensionValue } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
}

export function Skeleton({ width = '100%', height = 12, radius = 6 }: SkeletonProps) {
  const { colors } = useTheme();
  return <View style={{ width, height, borderRadius: radius, backgroundColor: colors.skeleton }} />;
}

export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  const { space } = useTheme();
  return (
    <View style={{ paddingHorizontal: space[20], paddingVertical: space[8] }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[styles.row, { gap: space[12], paddingVertical: 11 }]}>
          <Skeleton width={34} height={34} radius={17} />
          <View style={{ flex: 1 }}>
            <Skeleton width={i % 3 === 0 ? '52%' : '38%'} height={11} />
            <View style={{ marginTop: 6 }}>
              <Skeleton width="26%" height={9} />
            </View>
          </View>
          <Skeleton width={64} height={12} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
