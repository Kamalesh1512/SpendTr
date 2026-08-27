# Spendtr — Privacy-First Offline Expense & Subscription Tracker

## Product Overview

Spendtr is a cross-platform (iOS + Android) mobile app for manually tracking personal expenses and recurring subscriptions, with real multi-currency support, that never requires linking a bank account and stores all data on-device by default. Built for privacy-conscious users, expats/immigrants, and subscription-fatigued professionals who have specifically rejected bank-linked finance apps like Rocket Money, YNAB, Copilot, and Monarch.

Full product rationale: `docs/PRD.md`. Full market/customer validation: see the opportunity research memo this project was built from.

## MVP Scope

No-account local storage · fast manual transaction entry (target <5s) · multi-currency with base-currency conversion · categories · recurring subscription tracking with local renewal reminders · simple spending reports · basic monthly budgets · CSV/PDF export · biometric app lock · one-time Pro unlock (IAP).

**Explicitly not in MVP:** bank account linking (permanent exclusion), cloud sync, AI insights, investment tracking, shared budgets, envelope budgeting, third-party analytics. Full list: `docs/PRD.md` §9.

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
