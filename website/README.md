# SpendTr Website

The public marketing site + legal pages for SpendTr (landing page, Privacy Policy, Terms of
Service). Next.js (App Router) + TypeScript, no backend, deployed to Vercel.

This is a **separate app inside the SpendTr repo** — it has its own `package.json` and does not
share dependencies with the React Native app in the repo root. Run all commands from this
`website/` folder.

## Why this exists

The mobile app needs a publicly hosted Privacy Policy URL for Google Play / App Store submission
(see `../docs/PLAY_STORE_LAUNCH_GUIDE.md`). A real landing page + legal pages, hosted on Vercel,
serves that need now and doubles as the app's public presence for future SEO/AEO work — without
requiring any backend.

## Local development

```bash
cd website
npm install
npm run dev
```

Open http://localhost:3000.

## Before deploying — replace the placeholders

- `app/privacy/page.tsx` and `app/terms/page.tsx`: replace `[SET DATE BEFORE PUBLISHING]` with the
  actual publish date.
- `support@spendtr.com` (used in `components/Footer.tsx`, `app/privacy/page.tsx`,
  `app/terms/page.tsx`) assumes that inbox exists and is monitored — set it up before publishing,
  or swap in a different address everywhere it appears.
- The domain is `spendtr.com` (hardcoded as the fallback in `app/layout.tsx`, `app/sitemap.ts`,
  `app/robots.ts`). Once the domain is attached in Vercel, set `NEXT_PUBLIC_SITE_URL` there to
  match rather than relying on the fallback.
- The landing page's hero CTA currently reads "Coming soon on Google Play" (no link) since the app
  isn't live yet — once published, swap it for a real Play Store link in `app/page.tsx`.

## Deploying to Vercel

This site lives in a subfolder of the main repo, so Vercel needs to be told where to build from:

1. Push this repo to GitHub (if not already).
2. In the Vercel dashboard: **Add New → Project**, import this repo.
3. Under **Root Directory**, select `website` (not the repo root — the repo root is the Expo app,
   which Vercel should never try to build).
4. Framework preset: Next.js (auto-detected).
5. Add the `NEXT_PUBLIC_SITE_URL` environment variable once a custom domain is attached.
6. Deploy. Every push to the connected branch redeploys automatically.

No environment secrets are required — this site has no backend and calls no external APIs.

## Structure

```
website/
  app/
    layout.tsx        # Root layout: fonts, metadata, Header/Footer
    page.tsx           # Landing page
    privacy/page.tsx    # Privacy Policy (mirrors ../docs/legal/privacy-policy.html)
    terms/page.tsx      # Terms of Service
    sitemap.ts          # Auto-generated sitemap.xml
    robots.ts           # Auto-generated robots.txt
    icon.png            # Favicon (from ../assets/brand)
  components/
    Header.tsx, Footer.tsx, Logo.tsx
  public/
    og-image.png        # Open Graph / social share image
```

## Content accuracy

Every factual claim on this site (pricing, free-tier limits, feature list, what data is/isn't
collected) is sourced from `../docs/PRD.md`, `../docs/MONETIZATION.md`, `../docs/SECURITY.md`, and
`../docs/THIRD_PARTY_INTEGRATIONS.md`. If those documents change, update this site to match —
don't let the marketing copy drift from what the app actually does.
