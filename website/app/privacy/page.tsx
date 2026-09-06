import type { Metadata } from 'next';
import styles from './privacy.module.css';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'What SpendTr stores, where it is stored, and the few cases in which anything leaves your device.',
};

const TOC = [
  { href: '#summary', label: 'The short version' },
  { href: '#stores', label: 'What SpendTr stores' },
  { href: '#never', label: 'What it never collects' },
  { href: '#analytics', label: 'Analytics and crash reports' },
  { href: '#notifications', label: 'Notifications' },
  { href: '#backups', label: 'Backups and exports' },
  { href: '#purchases', label: 'Purchases' },
  { href: '#pro-link', label: 'The one email field' },
  { href: '#permissions', label: 'Permissions' },
  { href: '#children', label: 'Children' },
  { href: '#changes', label: 'Changes to this policy' },
  { href: '#contact', label: 'Contact' },
];

export default function PrivacyPolicy() {
  return (
    <>
      <div className={styles.titleWrap}>
        <div className={styles.titleBlock}>
          <div className={styles.eyebrow}>Legal</div>
          <h1 className={styles.title}>Privacy Policy</h1>
          <p className={styles.standfirst}>
            This policy describes what SpendTr stores, where it is stored, and the few cases in
            which anything leaves your device.
          </p>
          <div className={styles.meta}>Last updated 6 September 2026 · Version 1.0</div>
        </div>
      </div>

      <div className={styles.body}>
        <aside className={styles.toc}>
          <div className={styles.tocHeading}>On this page</div>
          <nav className={styles.tocNav}>
            {TOC.map((item) => (
              <a href={item.href} key={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        <article className={styles.article}>
          <section id="summary" className={styles.summaryCard}>
            <h2>The short version</h2>
            <ul>
              <li>
                Your transactions, accounts, budgets and settings are stored in a database on your
                phone. They are never uploaded.
              </li>
              <li>There is no SpendTr account, no password and no server to sign in to.</li>
              <li>No analytics, no advertising identifiers, no third-party trackers.</li>
              <li>
                The only optional email address in the app moves your Pro unlock between
                platforms, and it is deleted once the link is sent.
              </li>
            </ul>
          </section>

          <section id="stores" className={styles.section}>
            <h2>What SpendTr stores, and where</h2>
            <p>
              Everything you enter — amounts, categories, notes, accounts, recurring charges,
              budgets, goals and debts — is written to a local SQLite database inside SpendTr&apos;s
              private storage on your device. Your base currency, accent colour and notification
              preferences are stored the same way.
            </p>
            <p>
              Because that database is the only copy, deleting the app deletes your data. Export a
              backup first if you are switching phones.
            </p>
          </section>

          <section id="never" className={styles.section}>
            <h2>What SpendTr never collects</h2>
            <p>
              SpendTr does not ask for your name, email address, phone number or date of birth,
              and it never connects to a bank, card issuer or payment aggregator. It has no
              account system, so there are no credentials to store and nothing to breach.
            </p>
            <p>
              It does not read your SMS messages, notifications, contacts, calendar, photos or
              location.
            </p>
          </section>

          <section id="analytics" className={styles.section}>
            <h2>Analytics and crash reports</h2>
            <p>
              SpendTr contains no analytics SDK, no advertising identifier and no third-party
              trackers. No usage events are recorded and no crash reports are sent automatically.
              If you choose to report a problem by email, you decide what to include.
            </p>
            <p>
              Google Play and, in future, the App Store report their own aggregate install and
              crash statistics to us. Those reports come from the store, not from the app, and
              they never contain your entries.
            </p>
          </section>

          <section id="notifications" className={styles.section}>
            <h2>Notifications</h2>
            <p>
              Renewal reminders and daily logging nudges are scheduled locally by your phone from
              the dates you entered. Local only, no push server — so no renewal date, amount or
              merchant name is ever sent anywhere to produce a reminder.
            </p>
          </section>

          <section id="backups" className={styles.section}>
            <h2>Backups and exports</h2>
            <p>
              A backup is a single file, encrypted with the passphrase you type. SpendTr hands
              that file to whichever destination you pick in your phone&apos;s own share sheet — a
              cloud drive, a messaging app, local storage. SpendTr has no storage of its own and
              never sees where the file goes.
            </p>
            <p>
              The passphrase is not stored anywhere and cannot be recovered. A lost passphrase
              means the file can never be opened, by you or by us. CSV exports are written
              unencrypted, by design, so that other software can read them — treat them
              accordingly.
            </p>
          </section>

          <section id="purchases" className={styles.section}>
            <h2>Purchases</h2>
            <p>
              Pro is a one-time unlock, billed by Google Play (and later by the App Store). The
              store handles the payment and tells the app whether the purchase is valid; SpendTr
              never receives or stores your payment details. Refunds and receipts are handled by
              the store under its own privacy policy.
            </p>
          </section>

          <section id="pro-link" className={styles.section}>
            <h2>The one email field</h2>
            <p>
              Moving a Pro unlock from Android to iOS is the only feature that needs to contact
              us. You type an email address, we send a restore link to it, and the address is
              deleted once the link has been sent. There is no password, no profile and no mailing
              list, and none of your transactions are involved.
            </p>
            <p>
              This field is optional. Skipping it changes nothing about how the app works on the
              device you bought Pro on.
            </p>
          </section>

          <section id="permissions" className={styles.section}>
            <h2>Permissions</h2>
            <p>
              SpendTr requests two permissions, both optional and both opt-in: notifications, to
              schedule reminders on the device, and biometric unlock, to gate the app behind your
              phone&apos;s own fingerprint or face check. Declining either leaves every other
              feature intact.
            </p>
          </section>

          <section id="children" className={styles.section}>
            <h2>Children</h2>
            <p>
              SpendTr is a general-purpose tool and is not directed at children. Since it collects
              no personal data at all, no data about a child of any age is collected either.
            </p>
          </section>

          <section id="changes" className={styles.section}>
            <h2>Changes to this policy</h2>
            <p>
              If this policy changes, the version number and date at the top of the page change
              with it, and the previous version stays available at the link in the footer. A
              change that would send data off your device would ship as an opt-in setting,
              switched off, with an explanation in the app.
            </p>
          </section>

          <section id="contact" className={styles.section}>
            <h2>Contact</h2>
            <p>
              Questions about this policy, or about anything the app does with your data:{' '}
              <a href="mailto:privacy@spendtr.app">privacy@spendtr.com</a>. We answer from a
              mailbox, not a ticketing system, and we keep the correspondence only as long as the
              thread is open.
            </p>
          </section>
        </article>
      </div>
    </>
  );
}
