// 6-month spend column chart (docs/design_system/templates/spendtr-app/
// kit.jsx `ColumnChart`) — Reports' "Over time" view. Same visual language
// as BalanceChart: accent bars, tabular month labels, a tappable column.
import { Pressable, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';

export interface ColumnChartPoint {
  /** Short month label, e.g. "Mar". */
  month: string;
  totalMinor: number;
}

interface ColumnChartProps {
  points: ColumnChartPoint[];
  activeIndex: number;
  onPick: (index: number) => void;
  height?: number;
}

const VIEW_WIDTH = 350;

export function ColumnChart({ points, activeIndex, onPick, height = 132 }: ColumnChartProps) {
  const { colors, font } = useTheme();
  if (points.length === 0) return null;

  const max = Math.max(1, ...points.map((p) => p.totalMinor));
  const barGap = 10;
  const barWidth = (VIEW_WIDTH - barGap * (points.length - 1)) / points.length;
  const chartHeight = height - 24;

  return (
    <View>
      <Svg width="100%" height={chartHeight} viewBox={`0 0 ${VIEW_WIDTH} ${chartHeight}`}>
        {points.map((p, i) => {
          const barHeight = Math.max(3, (p.totalMinor / max) * (chartHeight - 6));
          const x = i * (barWidth + barGap);
          const y = chartHeight - barHeight;
          const active = i === activeIndex;
          return (
            <Rect
              key={p.month + i}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={4}
              fill={active ? colors.accent : colors.surfaceRaised}
            />
          );
        })}
      </Svg>
      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        {points.map((p, i) => (
          <Pressable key={p.month + i} onPress={() => onPick(i)} style={{ flex: 1, alignItems: 'center' }}>
            <Text
              style={{
                fontSize: font.size['2xs'],
                fontWeight: i === activeIndex ? '700' : '500',
                color: i === activeIndex ? colors.text : colors.textMuted,
              }}
            >
              {p.month}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
