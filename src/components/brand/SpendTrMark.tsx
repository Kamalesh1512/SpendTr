// SpendTr mark — three rounded bars, descending length: a ledger read
// left-to-right, or a spend breakdown sorted largest-first
// (docs/design_system/assets/logo-mark.svg,
// docs/design_system/components/brand/Logo.jsx). No wallet, no piggy bank,
// no currency glyph. Legible down to 16px, works in one color.
import Svg, { Rect } from 'react-native-svg';

interface SpendTrMarkProps {
  /** Rendered square size in px. 16px is the legibility floor. */
  size?: number;
  /** Color of the first two bars. */
  ink: string;
  /** Color of the shortest (third) bar — the brand accent. */
  accent: string;
  /** Force every bar to `ink` — required for single-color contexts (notification icon, print). */
  mono?: boolean;
}

export function SpendTrMark({ size = 28, ink, accent, mono = false }: SpendTrMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={2.5} y={5} width={19} height={3.5} rx={1.75} fill={ink} />
      <Rect x={2.5} y={10.25} width={12.5} height={3.5} rx={1.75} fill={ink} />
      <Rect x={2.5} y={15.5} width={7} height={3.5} rx={1.75} fill={mono ? ink : accent} />
    </Svg>
  );
}
