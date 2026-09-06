import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://spendtr.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'SpendTr — Private expense & subscription tracker',
    template: '%s — SpendTr',
  },
  description:
    'SpendTr is a privacy-first expense and subscription tracker for iOS and Android. Real multi-currency support, no bank account linking, ever. Your data stays on your device.',
  keywords: [
    'expense tracker',
    'subscription tracker',
    'privacy-first finance app',
    'multi-currency budgeting app',
    'no bank linking expense tracker',
  ],
  openGraph: {
    title: 'SpendTr — Private expense & subscription tracker',
    description:
      'Track spending and subscriptions in any currency, without ever linking a bank account. All data stays on your device.',
    url: siteUrl,
    siteName: 'SpendTr',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SpendTr' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpendTr — Private expense & subscription tracker',
    description:
      'Track spending and subscriptions in any currency, without ever linking a bank account. All data stays on your device.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
