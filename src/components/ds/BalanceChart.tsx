// 12-month closing-balance line chart with a tappable month strip
// (docs/design_system/templates/spendtr-app/kit.jsx `BalanceChart`) — the
// direct visual for Gap #1 (docs/PRD.md §2, "no historical account balance
// view"). The 22%→0% accent gradient under the line "exists to make the
// line readable, not to decorate" (docs/design_system/readme.md).
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';

export interface BalanceChartPoint {
  /** Short month label, e.g. "Jan". */
  month: string;
  closeMinor: number;
}

interface BalanceChartProps {
  points: BalanceChartPoint[];
  activeIndex: number;
  onPick: (index: number) => void;
  height?: number;
}

const VIEW_WIDTH = 350;

export function BalanceChart({ points, activeIndex, onPick, height = 132 }: BalanceChartProps) {
  const { colors, font } = useTheme();

  if (points.length < 2) return null;

  const vals = points.map((p) => p.closeMinor);
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const span = Math.max(1, max - min);
  const step = VIEW_WIDTH / (points.length - 1);
  const y = (v: number) => height - 16 - ((v - min) / span) * (height - 40);

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)} ${y(p.closeMinor).toFixed(1)}`).join(' ');
  const area = `${line} L${VIEW_WIDTH} ${height} L0 ${height} Z`;

  return (
    <View>
      <Svg viewBox={`0 0 ${VIEW_WIDTH} ${height}`} width="100%" height={height}>
        <Defs>
          <LinearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.accent} stopOpacity={0.22} />
            <Stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={area} fill="url(#balFill)" />
        <Path d={line} fill="none" stroke={colors.accent} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <G key={p.month + i}>
            {i === activeIndex ? (
              <Line
                x1={i * step}
                y1={0}
                x2={i * step}
                y2={height - 14}
                stroke={colors.borderStrong}
                strokeWidth={1}
                strokeDasharray="2 3"
              />
            ) : null}
            <Circle
              cx={i * step}
              cy={y(p.closeMinor)}
              r={i === activeIndex ? 4.5 : 2.5}
              fill={i === activeIndex ? colors.accent : colors.bg}
              stroke={colors.accent}
              strokeWidth={1.5}
            />
          </G>
        ))}
      </Svg>
      <View style={{ flexDirection: 'row', marginTop: 2 }}>
        {points.map((p, i) => (
          <Pressable key={p.month + i} onPress={() => onPick(i)} style={{ flex: 1, paddingVertical: 2 }}>
            <Text
              style={{
                textAlign: 'center',
                fontSize: font.size['2xs'],
                fontWeight: i === activeIndex ? '700' : '400',
                color: i === activeIndex ? colors.accent : colors.textMuted,
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
