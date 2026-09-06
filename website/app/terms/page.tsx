import type { Metadata } from 'next';
import styles from '../legal.module.css';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms governing use of the SpendTr app.',
};

export default function Terms() {
  return (
    <div className={styles.wrap}>
      <h1>Terms of Service</h1>
      <p className={styles.updated}>Last updated: [SET DATE BEFORE PUBLISHING]</p>

      <p>
        These terms govern your use of SpendTr (&quot;the app&quot;). By downloading or using the
        app, you agree to them. If you don&apos;t agree, please don&apos;t use the app.
      </p>

      <h2>What SpendTr is</h2>
      <p>
        SpendTr is a manual expense and subscription tracking tool. It does not connect to your
        bank accounts, does not provide financial advice, and is not a substitute for professional
        financial, tax, or accounting advice. You are solely responsible for the accuracy of the
        data you enter and any decisions you make based on it.
      </p>

      <h2>No account required</h2>
      <p>
        SpendTr has no login or account system. All data you enter is stored locally on your
        device. We have no ability to access, recover, or restore your data — if it is lost (for
        example, from uninstalling the app or losing your device without exporting first), it
        cannot be retrieved. Use the in-app export feature to keep your own backups.
      </p>

      <h2>Purchases</h2>
      <p>
        SpendTr offers an optional, one-time &quot;Pro&quot; unlock as an in-app purchase,
        processed through Apple&apos;s App Store or Google Play Billing (via RevenueCat). It is a
        single, non-recurring payment — not a subscription. Refunds are handled entirely by
        Apple&apos;s or Google&apos;s own refund policies and processes; we do not process
        payments or refunds directly.
      </p>

      <h2>Acceptable use</h2>
      <p>
        You agree not to reverse-engineer, decompile, or misuse the app in a way that could harm
        its functionality or other users, and to use it only for lawful personal purposes.
      </p>

      <h2>No warranty</h2>
      <p>
        The app is provided &quot;as is,&quot; without warranty of any kind, express or implied.
        We do not guarantee the app will be uninterrupted, error-free, or fit for any particular
        purpose. To the maximum extent permitted by law, we are not liable for any indirect,
        incidental, or consequential damages arising from your use of the app, including loss of
        data.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms from time to time, for example to reflect a new feature. If a
        change is material, we&apos;ll make a reasonable effort to surface it (such as an in-app
        notice or an update to this page&apos;s &quot;Last updated&quot; date).
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms can be sent to:{' '}
        <a href="mailto:support@spendtr.com">support@spendtr.com</a>
      </p>
    </div>
  );
}
