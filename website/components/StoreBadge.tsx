import Image from 'next/image';
import Icon from './Icon';
import styles from './StoreBadge.module.css';
import playBadge from '../public/get-it-on-google.png';

interface StoreBadgeProps {
  store: 'play' | 'apple';
  size?: 'header' | 'large';
  /** Flips the Apple badge live once the App Store listing ships — nothing else changes. */
  live?: boolean;
  href?: string;
}

export default function StoreBadge({ store, size = 'header', live = false, href }: StoreBadgeProps) {
  const iconSize = size === 'large' ? 24 : 17;
  const sizeClass = size === 'large' ? styles.large : styles.header;

  if (store === 'play') {
    const height = size === 'large' ? 56 : 40;
    return (
      <a href={href ?? '#download'} className={styles.playImageLink}>
        <Image
          src={playBadge}
          alt="Get it on Google Play"
          height={height}
          style={{ height, width: 'auto' }}
          priority={size === 'large'}
        />
      </a>
    );
  }

  const appleClass = `${styles.badge} ${sizeClass} ${styles.apple} ${live ? styles.live : ''}`;

  if (live) {
    return (
      <a href={href ?? '#'} className={appleClass}>
        <Icon name="logo-apple" size={iconSize} color="currentColor" />
        <span className={styles.text}>
          <span className={styles.kicker}>Download on the</span>
          <span className={styles.name}>App Store</span>
        </span>
      </a>
    );
  }

  return (
    <span className={appleClass} title="Coming soon">
      <Icon name="logo-apple" size={iconSize} color="currentColor" />
      <span className={styles.text}>
        <span className={styles.kicker}>Coming soon</span>
        <span className={styles.name}>App Store</span>
      </span>
    </span>
  );
}
