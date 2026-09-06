interface IconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
}

// Ionicons SVGs rendered as a CSS mask tinted to the given color — never
// inline the markup, never use an icon font (design_system/web_design spec).
export default function Icon({ name, size = 20, color = 'currentColor', className }: IconProps) {
  const url = `/assets/icons/${name}.svg`;
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        display: 'inline-block',
        flex: '0 0 auto',
        width: size,
        height: size,
        background: color,
        WebkitMask: `url(${url}) center / contain no-repeat`,
        mask: `url(${url}) center / contain no-repeat`,
      }}
    />
  );
}
