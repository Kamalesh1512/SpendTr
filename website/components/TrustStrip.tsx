import Icon from './Icon';
import styles from './TrustStrip.module.css';

const ITEMS = [
  { icon: 'shield-checkmark-outline', text: 'No bank account required' },
  { icon: 'finger-print', text: 'No login, ever' },
  { icon: 'airplane', text: 'Works fully offline' },
  { icon: 'pricetag', text: 'No ads, no trackers' },
];

export default function TrustStrip() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        {ITEMS.map((item) => (
          <div className={styles.item} key={item.icon}>
            <Icon name={item.icon} size={22} color="var(--accent)" />
            <span className={styles.text}>{item.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
