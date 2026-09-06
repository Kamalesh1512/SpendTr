import PhoneFrame from '@/components/PhoneFrame';
import StoreBadge from '@/components/StoreBadge';
import FeaturePicker from '@/components/FeaturePicker';
import TrustStrip from '@/components/TrustStrip';
import { HomeScreen } from '@/components/screens/AppScreens';
import styles from './page.module.css';

export default function Home() {
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <h1 className={styles.heroTitle}>Every expense, on your phone only.</h1>
          <p className={styles.heroSub}>
            Log spending and subscriptions by hand, in any currency. No bank connection, no
            account, nothing uploaded.
          </p>
          <div className={styles.buttonRow}>
            <StoreBadge store="play" size="large" href="#download" />
            <StoreBadge store="apple" size="large" />
          </div>
          <div className={styles.factLine}>
            Free · one-time Pro unlock · 47 currencies · 54 categories
          </div>
        </div>
        <div className={styles.heroMedia}>
          <PhoneFrame size="hero">
            <HomeScreen />
          </PhoneFrame>
        </div>
      </section>

      <FeaturePicker />

      <div id="privacy">
        <TrustStrip />
      </div>

      <section id="download" className={styles.finalCta}>
        <div className={styles.finalCtaInner}>
          <h2 className={styles.finalCtaTitle}>Start tracking in about three taps.</h2>
          <div className={styles.finalCtaButtons}>
            <StoreBadge store="play" size="large" href="#download" />
            <StoreBadge store="apple" size="large" />
          </div>
          <div className={styles.finalCtaNote}>Your data never leaves your phone.</div>
        </div>
      </section>
    </>
  );
}
