// Exact bar geometry from docs/design_system/assets/logo-mark.svg — do not
// redraw. Mirrors src/components/brand/SpendTrMark.tsx in the app.
interface LogoProps {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}

export default function Logo({ size = 22, withWordmark = true, className }: LogoProps) {
  const fontSize = Math.round(size * 0.82);
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(size * 0.4) }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x={2.5} y={5} width={19} height={3.5} rx={1.75} fill="var(--accent)" />
        <rect x={2.5} y={10.25} width={12.5} height={3.5} rx={1.75} fill="var(--accent)" />
        <rect x={2.5} y={15.5} width={7} height={3.5} rx={1.75} fill="var(--accent)" />
      </svg>
      {withWordmark && (
        <span style={{ fontSize, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text)' }}>
          Spend<span style={{ color: 'var(--accent)' }}>Tr</span>
        </span>
      )}
    </span>
  );
}
