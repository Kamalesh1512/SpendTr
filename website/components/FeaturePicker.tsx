'use client';

import { useState } from 'react';
import PhoneFrame from './PhoneFrame';
import styles from './FeaturePicker.module.css';
import {
  AccountDetailScreen,
  SplitTransactionScreen,
  AddTransactionScreen,
  BackupScreen,
  PaywallScreen,
} from './screens/AppScreens';

const FEATURES = [
  { label: 'Running balance', headline: 'Every entry shows the balance it left behind.', Screen: AccountDetailScreen },
  { label: 'Splits', headline: 'One receipt, split across the categories it really was.', Screen: SplitTransactionScreen },
  { label: 'Multi-currency', headline: 'Spend in one currency, total in another.', Screen: AddTransactionScreen },
  { label: 'Backup', headline: 'One encrypted file, handed to whichever app you trust.', Screen: BackupScreen },
  { label: 'Pro', headline: 'Paid once. Works on Android and iOS.', Screen: PaywallScreen },
];

export default function FeaturePicker() {
  const [active, setActive] = useState(0);
  const ActiveScreen = FEATURES[active].Screen;

  return (
    <section className={styles.section} id="features">
      <div className={styles.inner}>
        <div className={styles.media}>
          <PhoneFrame size="feature">
            <ActiveScreen />
          </PhoneFrame>
        </div>
        <div className={styles.list}>
          {FEATURES.map((f, i) => (
            <button
              key={f.label}
              type="button"
              onClick={() => setActive(i)}
              className={`${styles.row} ${i === active ? styles.rowActive : ''}`}
            >
              <span className={styles.rowLabel}>{f.label}</span>
              <span className={styles.rowHeadline}>{f.headline}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
