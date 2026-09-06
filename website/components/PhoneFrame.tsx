import type { ReactNode } from 'react';
import styles from './PhoneFrame.module.css';

interface PhoneFrameProps {
  size: 'hero' | 'feature';
  children: ReactNode;
}

export default function PhoneFrame({ size, children }: PhoneFrameProps) {
  return (
    <div className={size === 'hero' ? styles.hero : styles.feature}>
      <div className={styles.clip}>{children}</div>
    </div>
  );
}
