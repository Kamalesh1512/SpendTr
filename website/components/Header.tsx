'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';
import StoreBadge from './StoreBadge';
import styles from './Header.module.css';

export default function Header() {
  const pathname = usePathname();
  const isPrivacy = pathname === '/privacy';

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" aria-label="SpendTr home" className={styles.brand}>
          <Logo size={30} />
        </Link>
        <nav className={`${styles.nav} ${styles.navCompact}`}>
          <Link href="/#features">Features</Link>
          <Link href="/privacy" className={isPrivacy ? styles.navActive : undefined}>
            Privacy
          </Link>
          <Link href="/#download">Download</Link>
        </nav>
        <div className={styles.badges}>
          <span className={styles.navCompact}>
            <StoreBadge store="apple" size="header" />
          </span>
          <StoreBadge store="play" size="header" href="/#download" />
        </div>
      </div>
    </header>
  );
}
