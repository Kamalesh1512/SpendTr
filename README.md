# Spendtr — Privacy-First Offline Expense & Subscription Tracker

## Product Overview

Spendtr is a cross-platform (iOS + Android) mobile app for manually tracking personal expenses, subscriptions, budgets, goals, and debts, with real multi-currency support and multiple accounts, that never requires linking a bank account and never requires any account — including for backup. Built for privacy-conscious users, expats/immigrants, and subscription-fatigued professionals who have specifically rejected bank-linked finance apps like Rocket Money, YNAB, Copilot, and Monarch.

**Competitive positioning:** Spendtr targets feature parity with Cashew (the strongest existing open-source competitor) plus five specific, evidence-backed fixes: a historical account running-balance view, the ability to split one transaction across multiple categories, explicit tested performance budgets, a Pro purchase that works across both iOS and Android, and a backup feature that works with any storage provider — never requiring a Google account. Full rationale: `docs/PRD.md` §2.

Full product rationale: `docs/PRD.md`. Full market/customer validation: see the opportunity research memo this project was built from.

## Phased Scope

**Phase 1 (real MVP target, ~3–4 weeks):** no-account local storage, fast manual entry (target <5s), accounts, multi-currency, categories, recurring transactions (subscriptions/bills/income) with reminders, monthly budgets with category limits, **account running-balance history**, biometric lock, CSV export, dark/light mode + accent color, tested performance budgets.

**Phase 2 (feature parity + remaining differentiators):** transaction splitting, goals, debts, flexible budget periods, search/filter, bulk edit/delete, CSV import, cross-platform Pro restore, backup/restore to any provider via native file picker.

**Phase 3 (deferred, not built without a scope update):** real-time multi-device sync, localization, home screen widgets, app-link automation.

**Permanently excluded, all phases:** bank account linking, any mandatory account/login, third-party analytics, AI insights, bill negotiation, ads, Google Sheets import. Full detail: `docs/PRD.md` §5–6.

## Technology Stack

| Layer | Choice |
|---|---|
| Mobile framework | React Native + Expo (managed workflow), TypeScript |
| Navigation | Expo Router |
| Local database | SQLite (`expo-sqlite`) via Drizzle ORM |
| State management | Zustand |
| Forms/validation | react-hook-form + zod |
| In-app purchases | RevenueCat |
| Notifications | `expo-notifications` (local only, no push server) |
| Biometrics | `expo-local-authentication` |
| Crash reporting | Sentry (opt-in only) |
| Backend | **None in the MVP** — see `docs/ARCHITECTURE.md` §1 |
| Build/release | EAS Build + EAS Submit |

Full rationale for these choices: `docs/CLAUDE.md` §6.

## Repository Structure

```
spendtr-app/
├── app/                     # Expo Router screens
├── src/
│   ├── components/
│   ├── db/                  # Drizzle schema + client
│   ├── repositories/        # All data access goes through here
│   ├── stores/               # Zustand
│   ├── services/             # currency, notifications, export, purchases
│   ├── hooks/
│   ├── utils/
│   └── types/
├── docs/
│   ├── PRD.md
│   ├── CLAUDE.md              # Start here for AI-assisted development
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── API_DESIGN.md
│   ├── CODING_STANDARDS.md
│   ├── USER_FLOWS.md
│   ├── UI_UX_GUIDELINES.md
│   ├── SECURITY.md
│   ├── TESTING_STRATEGY.md
│   ├── DEPLOYMENT.md
│   ├── ENVIRONMENT_VARIABLES.md
│   ├── THIRD_PARTY_INTEGRATIONS.md
│   ├── MONETIZATION.md
│   └── ANALYTICS.md
├── .env.example
└── README.md
```

## Documentation Map

Start with **`docs/CLAUDE.md`** — it's the primary context document and links to everything else in priority order. If you're using Claude Code, point it at that file first.

| Doc | Answers |
|---|---|
| `PRD.md` | What are we building and why? What's in/out of scope? |
| `ARCHITECTURE.md` | How is the system structured? Why no backend? |
| `DATABASE_SCHEMA.md` | What tables/columns exist locally? |
| `API_DESIGN.md` | What's the internal data-layer contract + external API contracts? |
| `CODING_STANDARDS.md` | How should code be written and organized? |
| `USER_FLOWS.md` | Step-by-step screen flows for each feature |
| `UI_UX_GUIDELINES.md` | Visual/interaction design principles |
| `SECURITY.md` | Threat model and mitigations |
| `TESTING_STRATEGY.md` | What to test and how |
| `DEPLOYMENT.md` | How to build and ship to both stores |
| `ENVIRONMENT_VARIABLES.md` | What config/keys are needed |
| `THIRD_PARTY_INTEGRATIONS.md` | Every external service used, and why |
| `MONETIZATION.md` | Pricing model, free vs. Pro feature split |
| `ANALYTICS.md` | What is and isn't tracked (short answer: almost nothing) |

## Local Development

```bash
# Install dependencies
npm install

# Copy and fill in environment variables (see docs/ENVIRONMENT_VARIABLES.md)
cp .env.example .env

# Start the Expo dev server
npx expo start
```

Once native modules are added (biometrics, notifications, IAP — all needed early per `docs/ARCHITECTURE.md` §9), Expo Go is no longer sufficient; build a development client:

```bash
eas build --profile development --platform ios
eas build --profile development --platform android
```

No backend/database setup step exists — the app runs entirely against its local SQLite database from first launch. This is a meaningfully simpler local setup than this developer's usual full-stack (FastAPI + PostgreSQL + Docker Compose) workflow, by design.

## Environment Setup Overview

See `docs/ENVIRONMENT_VARIABLES.md` for the full list. In short: an exchange-rate API base URL/key, RevenueCat public SDK keys (iOS + Android), and an optional Sentry DSN. All are `EXPO_PUBLIC_*` client-embedded values — there are no server secrets in this project because there is no server.

## Development Commands

```bash
npx expo start              # Start dev server
npx tsc --noEmit             # Type check
npx jest                     # Unit + component tests
npx eas build --profile preview --platform all   # Beta build for both stores
npx eas submit --platform ios                     # Submit to App Store
npx eas submit --platform android                 # Submit to Google Play
```

## End-to-End Tests (Maestro)

Flows live under `.maestro/` (`docs/TESTING_STRATEGY.md` §3, flows 1–5 — the Phase 1 minimum). Each top-level flow calls the shared `subflows/onboarding.yaml` first, so every flow runs standalone against a freshly cleared app state.

```bash
# Install Maestro once (https://maestro.mobile.dev): curl -Ls "https://get.maestro.mobile.dev" | bash

npx expo run:android         # build the dev client onto a running emulator/device first
maestro test .maestro/01-onboarding-and-first-transaction.yaml
maestro test .maestro/02-add-recurring.yaml
maestro test .maestro/03-free-tier-paywall.yaml   # stops at the paywall — the sandbox purchase step needs a RevenueCat sandbox tester signed in on-device, which is per-developer setup
maestro test .maestro/04-export-csv.yaml
maestro test .maestro/05-account-balance-view.yaml
# or run them all:
maestro test .maestro
```
