# DelanBank Demo

A full-stack banking dashboard demo built with Next.js 14, TypeScript, Tailwind
CSS, Supabase Auth, and Supabase Postgres. New users receive three simulated
bank accounts and sample transactions. Internal transfers update account
balances and create paired ledger entries atomically in the database.

> **Demo only:** balances, banks, and transfers are simulated. This project is
> not a bank and does not connect to real accounts or move real money. Do not
> enter real financial, identity, or banking information.

## Features

- Supabase email/password sign-up, sign-in, and sign-out
- Per-user data isolation using Postgres row-level security
- Automatically seeded demo accounts and transaction history
- Dashboard balances, account list, transaction history, and categories
- Atomic simulated transfers between a user’s own demo accounts
- Responsive layout for desktop and mobile
- Optional Sentry monitoring

## Requirements

- Node.js 18 or newer
- npm
- A Supabase project

## Configure Supabase

1. Create a project at [supabase.com](https://supabase.com/).
2. In the Supabase SQL Editor, run
   [`supabase/migrations/20261016000000_demo_banking.sql`](./supabase/migrations/20261016000000_demo_banking.sql).
   It creates the schema, row-level security policies, profile/account seeding,
   and the simulated-transfer database function.
3. In Supabase **Project Settings → API**, copy the Project URL and the
   publishable/anon key.
4. Copy `.env.example` to `.env.local`, then set:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
   ```

   Never put a Supabase `service_role` key in a `NEXT_PUBLIC_` variable or in
   this repository. This app uses the user-scoped publishable key and database
   row-level security.

5. For immediate local demo sign-up, turn off email confirmations in
   **Authentication → Providers → Email**. If confirmation remains enabled,
   new users must confirm their email before signing in.

## Run locally

```bash
npm ci
cp .env.example .env.local
# Add the Supabase URL and anon/publishable key to .env.local
npm run preview
```

Open [http://localhost:3000](http://localhost:3000), create an account, and
explore the dashboard. Sign-up asks only for a name, email, and password. On
successful account creation, the database trigger creates three simulated
accounts and sample transactions. Use **Demo transfer** to transfer between
those accounts; the resulting balances and transaction history persist in
Supabase.

## Scripts

```bash
npm run dev       # Development server
npm run preview   # Development preview bound to all interfaces
npm run build     # Production build
npm run start     # Production server bound to all interfaces
npm run lint      # ESLint
```

## Deploy

Deploy to Vercel or another Next.js host. Set
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the hosting
environment, apply the SQL migration to the production Supabase project, and
configure the Supabase Auth site URL and redirect URLs for the deployed
domain. Disable email confirmation only for a throwaway demo project.

Sentry is optional. Set `NEXT_PUBLIC_SENTRY_DSN` to enable event reporting;
set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` as well to upload
source maps during the build.
