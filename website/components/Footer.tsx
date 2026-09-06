import Link from 'next/link';
import Logo from './Logo';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.tagline}>
          <Logo size={18} withWordmark={false} className={styles.mark} />
          <span>All your data lives only on this device.</span>
        </div>
        <nav className={styles.links}>
          <Link href="/privacy">Privacy Policy</Link>
          <a href="mailto:support@spendtr.app">Support</a>
          <span>© {new Date().getFullYear()} SpendTr</span>
        </nav>
      </div>
    </footer>
  );
}
