// Static stand-ins for the real app screens, built to match the structure,
// copy and token usage of the source screens in the design project
// (screens/home.jsx, accounts.jsx, entry.jsx, data-mgmt.jsx, settings.jsx).
// Until real 390x844 exports are supplied, these reproduce the same layout
// so the marketing site is accurate today and can swap in real <img> exports
// later without touching surrounding markup.
import Icon from '../Icon';
import styles from './AppScreens.module.css';

const ACCOUNT_DOTS = ['#5B5FEF', '#22C55E', '#F97316'];

// Icon + color pairs are the real seeded defaults from
// src/db/seedData/categories.ts (CATEGORY_SEED) — never invented colors.
const CAT = {
  dining: { icon: 'restaurant', color: '#F97316', name: 'Dining & Restaurants' },
  transport: { icon: 'bus', color: '#3B82F6', name: 'Transport' },
  groceries: { icon: 'basket', color: '#84CC16', name: 'Groceries' },
  freelance: { icon: 'briefcase', color: '#0EA5E9', name: 'Freelance' },
  subscriptions: { icon: 'repeat', color: '#06B6D4', name: 'Subscriptions' },
  bars: { icon: 'wine', color: '#9F1239', name: 'Bars & Nightlife' },
};

const LEDGER = [
  { day: 'Today', total: '-4.80', items: [{ cat: CAT.dining, label: 'Coffee & pastry', sub: CAT.dining.name, amount: '-4.80' }] },
  {
    day: 'Yesterday',
    total: '+588.00',
    items: [
      { cat: CAT.freelance, label: 'Freelance payment', sub: CAT.freelance.name, amount: '+620.00' },
      { cat: CAT.transport, label: 'Metro pass', sub: CAT.transport.name, amount: '-32.00' },
    ],
  },
  { day: 'Mon', total: '-58.40', items: [{ cat: CAT.groceries, label: 'Groceries', sub: CAT.groceries.name, amount: '-58.40' }] },
];

const HUB = [
  { icon: 'swap-horizontal', label: 'Accounts' },
  { icon: 'pie-chart', label: 'Budgets' },
  { icon: 'flag', label: 'Goals' },
  { icon: 'people', label: 'Debts' },
];

export function HomeScreen() {
  return (
    <div className={styles.screen}>
      <div className={styles.navBar}>
        <span className={styles.pill}>
          <span className={styles.pillDots}>
            {ACCOUNT_DOTS.map((c) => (
              <span key={c} className={styles.pillDot} style={{ background: c }} />
            ))}
          </span>
          <span className={styles.pillLabel}>All accounts</span>
          <Icon name="chevron-down" size={11} color="var(--text-muted)" />
        </span>
        <span style={{ flex: 1 }} />
        <Icon name="search" size={16} color="var(--text-muted)" />
        <Icon name="options-outline" size={16} color="var(--text-muted)" />
      </div>

      <div style={{ padding: '2px 16px 10px' }}>
        <div className={styles.sectionLabel}>Spent in August</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 3 }}>
          <span className={styles.bigAmount}>€3,055.60</span>
          <span className={styles.deltaUp}>
            <Icon name="arrow-down" size={10} color="var(--success, #3dd68c)" />
            0.3%
          </span>
        </div>
        <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 4 }}>Balance €2,138.20 across 3 accounts</div>
        <div className={styles.hubRow} style={{ marginTop: 10, padding: 0 }}>
          {HUB.map((h) => (
            <div className={styles.hubTile} key={h.label}>
              <Icon name={h.icon} size={14} color="var(--accent)" />
              <span className={styles.hubLabel}>{h.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {LEDGER.map((g) => (
          <div key={g.day}>
            <div className={styles.dayHeader}>
              <span>{g.day}</span>
              <span>{g.total}</span>
            </div>
            {g.items.map((t) => (
              <div className={styles.txnRow} key={t.label}>
                <span className={styles.catDot} style={{ background: t.cat.color }}>
                  <Icon name={t.cat.icon} size={13} color="#FFFFFF" />
                </span>
                <span className={styles.txnMain}>
                  <span className={styles.txnLabel}>{t.label}</span>
                  <span className={styles.txnSub}>{t.sub}</span>
                </span>
                <span className={styles.txnAmount}>{t.amount}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className={styles.quickAdd}>
        <div className={styles.quickAddBtn}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-contrast)', opacity: 0.7 }}>€</span>
          <span className={styles.quickAddLabel}>Add expense</span>
          <span className={styles.quickAddDot}>
            <Icon name="add" size={14} color="var(--accent-contrast)" />
          </span>
        </div>
      </div>
    </div>
  );
}

export function AccountDetailScreen() {
  const bars = [40, 55, 48, 62, 58, 70, 66, 78, 72, 85, 80, 92];
  return (
    <div className={styles.screen}>
      <div className={styles.navBar}>
        <Icon name="chevron-back" size={16} color="var(--text-muted)" />
        <span className={styles.navTitle}>
          <span className={styles.navTitleMain}>Revolut</span>
          <span className={styles.navTitleSub}>EUR · card</span>
        </span>
        <Icon name="ellipsis-vertical" size={16} className={styles.navIcon} color="var(--text-muted)" />
      </div>
      <div className={styles.body}>
        <div>
          <div className={styles.sectionLabel}>Balance today</div>
          <div className={styles.bigAmount} style={{ fontSize: 24, marginTop: 3 }}>€1,892.40</div>
          <span className={styles.deltaPill} style={{ marginTop: 6 }}>
            <Icon name="arrow-up" size={9} color="var(--success, #3dd68c)" />
            €144.40 this month
          </span>
        </div>

        <div className={styles.chart}>
          {bars.map((h, i) => (
            <span
              key={i}
              className={i === bars.length - 1 ? `${styles.chartBar} ${styles.chartBarActive}` : styles.chartBar}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>

        <div className={styles.card}>
          <div className={styles.cardRow} style={{ fontWeight: 600 }}>
            <span>August 2026</span>
            <span style={{ color: 'var(--success, #3dd68c)' }}>+€144.40</span>
          </div>
          <div className={styles.cardRow}>
            <span className={styles.cardRowLabel}>Money in</span>
            <span className={styles.cardRowValue} style={{ color: 'var(--success, #3dd68c)' }}>€620.00</span>
          </div>
          <div className={styles.cardRow}>
            <span className={styles.cardRowLabel}>Money out</span>
            <span className={styles.cardRowValue}>€475.60</span>
          </div>
          <div className={styles.cardRow}>
            <span className={styles.cardRowLabel}>Closing balance</span>
            <span className={styles.cardRowValue}>€1,892.40</span>
          </div>
        </div>

        <div className={styles.linkRow}>
          View the 24 entries in August
          <Icon name="chevron-forward" size={11} color="var(--accent)" />
        </div>

        <div>
          <div className={styles.sectionLabel} style={{ marginBottom: 2 }}>Month by month</div>
          {['July 2026', 'June 2026', 'May 2026'].map((m, i) => (
            <div className={styles.monthRow} key={m}>
              <span style={{ flex: 1 }}>{m}</span>
              <span style={{ color: 'var(--success, #3dd68c)', fontVariantNumeric: 'tabular-nums' }}>+€{(96 - i * 12).toFixed(2)}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>€{(1748 - i * 96).toFixed(2)}</span>
              <Icon name="chevron-forward" size={10} color="var(--text-muted)" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SplitTransactionScreen() {
  const rows = [
    { cat: CAT.dining, label: 'Dining & Restaurants', pct: 57, amount: '€32.00' },
    { cat: CAT.bars, label: 'Bars & Nightlife', pct: 21, amount: '€12.00' },
    { cat: CAT.transport, label: 'Transport', pct: 22, amount: '€12.40' },
  ];
  return (
    <div className={styles.screen}>
      <div className={styles.sheetHeader}>
        <div className={styles.sheetTitle}>Split €56.40</div>
        <div className={styles.sheetSubtitle}>Dinner with Priya · 28 Aug · Revolut</div>
      </div>
      <div className={styles.body}>
        <div className={styles.statusCard}>
          <div className={styles.statusHead}>
            <span className={styles.statusLabel}>Fully allocated</span>
            <span className={styles.statusValue}>€0.00</span>
          </div>
          <div className={styles.track}>
            <div className={styles.trackFill} style={{ width: '100%' }} />
          </div>
          <div className={styles.statusFoot}>
            <span>€56.40 allocated</span>
            <span>of €56.40</span>
          </div>
        </div>

        <div>
          <div className={styles.sectionLabel} style={{ marginBottom: 4 }}>Split rows</div>
          {rows.map((r) => (
            <div className={styles.splitRow} key={r.label}>
              <span className={styles.catDot} style={{ background: r.cat.color }}>
                <Icon name={r.cat.icon} size={13} color="#FFFFFF" />
              </span>
              <span className={styles.splitMain}>
                <div className={styles.splitLabel}>{r.label}</div>
                <div className={styles.splitPct}>{r.pct}% of the entry</div>
              </span>
              <span className={styles.splitAmount}>{r.amount}</span>
              <Icon name="remove" size={13} color="var(--text-muted)" />
            </div>
          ))}
          <div className={styles.dashedRow}>
            <Icon name="add" size={13} color="var(--accent)" />
            Add a category
          </div>
        </div>

        <div className={styles.primaryButton} style={{ marginTop: 'auto', marginBottom: 12 }}>
          Save split
        </div>
      </div>
    </div>
  );
}

export function AddTransactionScreen() {
  // Mirrors app/add-transaction.tsx: a pill segmented control (not a boxed
  // tab bar), a circular close button with an X (not an empty ring), no
  // "Cash" pill by default (the account pill only shows with 2+ accounts),
  // and src/components/ds/Keypad.tsx's 3-wide digit grid next to a narrow
  // backspace-then-tall-Save action column — not a solid calculator grid.
  const mru = [
    { cat: CAT.subscriptions, label: 'Subscript.' },
    { cat: CAT.groceries, label: 'Groceries' },
    { cat: CAT.dining, label: 'Dining' },
    { cat: CAT.transport, label: 'Transport' },
  ];
  return (
    <div className={styles.screen}>
      <div className={styles.grabberRow}>
        <span className={styles.grabber} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px 8px' }}>
        <div className={styles.segmented}>
          <span className={`${styles.segItem} ${styles.segItemActive}`}>Expense</span>
          <span className={styles.segItem}>Income</span>
        </div>
        <span className={styles.closeCircle}>
          <Icon name="close" size={11} color="var(--text-muted)" />
        </span>
      </div>

      <div className={styles.amountDisplay}>
        <span className={styles.amountSymbol}>$</span>
        <span className={styles.amountFigure}>15.99</span>
        <span className={styles.amountCursor} />
      </div>
      <div className={styles.convertRow}>≈ €14.72 at today&apos;s rate</div>

      <div style={{ padding: '10px 14px 0' }}>
        <div className={styles.mruRow}>
          {mru.map((c) => (
            <div className={styles.mruItem} key={c.label}>
              <span className={styles.mruDot} style={{ background: c.cat.color }}>
                <Icon name={c.cat.icon} size={14} color="#FFFFFF" />
              </span>
              <span className={`${styles.mruLabel} ${c.label === 'Subscript.' ? styles.mruLabelActive : ''}`}>{c.label}</span>
            </div>
          ))}
          <div className={styles.mruItem}>
            <span className={styles.mruDot} style={{ border: '1px dashed var(--border-strong, var(--border))' }}>
              <Icon name="ellipsis-horizontal" size={12} color="var(--text-muted)" />
            </span>
            <span className={styles.mruLabel}>All 54</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '10px 14px 0' }}>
        <div className={styles.pillsRow}>
          <span className={styles.metaPill}>
            <Icon name="calendar-outline" size={10} color="var(--text-muted)" />
            Today
          </span>
          <span className={styles.metaPill}>
            <Icon name="swap-horizontal" size={10} color="var(--text-muted)" />
            USD
          </span>
          <span className={`${styles.metaPill} ${styles.metaPillAccent}`}>
            <Icon name="create-outline" size={10} color="var(--accent)" />
            Note
          </span>
          <span className={`${styles.metaPill} ${styles.metaPillAccent}`}>
            <Icon name="pie-chart" size={10} color="var(--accent)" />
            Split
          </span>
        </div>
      </div>

      <div className={styles.keypad}>
        <div className={styles.digitColumn}>
          {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map((row) => (
            <div className={styles.digitRow} key={row.join()}>
              {row.map((d) => (
                <span className={styles.key} key={d}>
                  {d}
                </span>
              ))}
            </div>
          ))}
          <div className={styles.digitRow}>
            <span className={styles.key}>.</span>
            <span className={`${styles.key} ${styles.zeroKey}`}>0</span>
          </div>
        </div>
        <div className={styles.actionColumn}>
          <span className={styles.key}>
            <Icon name="backspace-outline" size={13} color="var(--text)" />
          </span>
          <span className={styles.keySave}>Save</span>
        </div>
      </div>
    </div>
  );
}

export function BackupScreen() {
  return (
    <div className={styles.screen}>
      <div className={styles.navBar}>
        <Icon name="chevron-back" size={16} color="var(--text-muted)" />
        <span className={styles.navTitleMain}>Back up</span>
      </div>
      <div className={styles.body}>
        <p className={styles.paragraph} style={{ margin: 0 }}>
          A backup is a single encrypted file. You choose where it goes — SpendTr never uploads it anywhere.
        </p>

        <div className={styles.card}>
          <div className={styles.cardRow} style={{ gap: 8 }}>
            <Icon name="document-text-outline" size={13} color="var(--accent)" />
            <span style={{ flex: 1 }}>1,284 entries · 3 accounts</span>
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Passphrase</span>
          <div className={styles.fieldBox}>
            <span>copper-lantern-vivid-otter</span>
            <Icon name="eye-outline" size={12} color="var(--text-muted)" />
          </div>
          <div className={styles.strengthRow}>
            {[0, 1, 2, 3].map((i) => (
              <span className={styles.strengthSeg} key={i} />
            ))}
          </div>
          <span className={styles.strengthNote}>Strong — four words, 25 characters</span>
        </div>

        <div className={styles.noteBox}>
          <Icon name="warning-outline" size={13} color="var(--warning, #f5b23d)" />
          <span className={styles.noteText}>
            <strong>There is no recovery.</strong> A lost passphrase means the file can never be opened.
          </span>
        </div>

        <div className={styles.checkRow}>
          <span className={styles.checkBox} />
          <span className={styles.checkText}>I&apos;ve saved this passphrase somewhere I can find it.</span>
        </div>

        <div className={styles.primaryButton}>
          <Icon name="cloud-upload-outline" size={13} color="var(--accent-contrast)" />
          Encrypt and choose location
        </div>
      </div>
    </div>
  );
}

export function PaywallScreen() {
  const features = [
    { icon: 'swap-horizontal', label: 'Unlimited currencies', hint: 'Free covers your base currency plus one.' },
    { icon: 'repeat', label: 'Unlimited recurring items', hint: 'Free tracks up to five.' },
    { icon: 'stats-chart', label: 'Every past month in Reports', hint: 'Free shows the current month.' },
    { icon: 'document-text-outline', label: 'CSV and PDF export', hint: null },
  ];
  return (
    <div className={styles.screen}>
      <div className={styles.paywallHead}>
        <span className={styles.paywallLogo}>
          <Icon name="logo-mark" size={20} color="var(--accent-contrast)" />
        </span>
        <div className={styles.paywallTitle}>SpendTr Pro</div>
        <p className={styles.paywallSub}>
          You hit the free limit on past-month reports. Pro removes every limit below, once.
        </p>
      </div>

      <div className={styles.featureRows}>
        {features.map((f) => (
          <div className={styles.featureRow} key={f.label}>
            <span className={styles.featureDot}>
              <Icon name={f.icon} size={11} color="var(--accent)" />
            </span>
            <span>
              <div className={styles.featureLabel}>{f.label}</div>
              {f.hint ? <div className={styles.featureHint}>{f.hint}</div> : null}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.priceCard}>
        <div className={styles.priceFigure}>$24.99</div>
        <div className={styles.priceNote}>One payment. No subscription, no renewal.</div>
      </div>

      <div className={styles.paywallFooter}>
        <div className={styles.primaryButton}>Unlock Pro — $24.99</div>
        <div className={styles.linkButton}>Restore Purchases</div>
        <div className={styles.quietButton}>Not now</div>
      </div>
    </div>
  );
}
