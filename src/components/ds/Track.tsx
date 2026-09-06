// Progress meter — budgets, goals, split-allocation (promoted from
// docs/design_system/templates/spendtr-app/kit.jsx `Track`, the design's
// generic progress bar; kept minimal since no standalone Track.d.ts ships
// in components/, only this pattern reused across screens). Animates its
// width on duration.base — "the extent of animated data" per the design.
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface TrackProps {
  /** 0-100. Values outside that range are clamped. */
  percent: number;
  color?: string;
  height?: number;
}

export function Track({ percent, color, height = 6 }: TrackProps) {
  const { colors, radius } = useTheme();
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View style={[styles.wrap, { height, borderRadius: radius.sm, backgroundColor: colors.border }]}>
      <View
        style={{
          height,
          width: `${clamped}%`,
          borderRadius: radius.sm,
          backgroundColor: color ?? colors.accent,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
});
