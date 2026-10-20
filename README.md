# First Grade Finance

A financial-services product prototype built with Next.js 14, TypeScript,
Tailwind CSS, Supabase Auth, and Supabase Postgres. New users receive three
sample accounts and activity. Internal transfers update example balances and
create paired ledger entries atomically in the database.

> **Prototype disclosure:** This application is not a bank and does not connect
> to real financial institutions, send real payments, or move money. Account
> details, balances, and transaction states are examples only. Do not enter real
> financial, identity, or banking information. This prototype is not ready for
> production financial use.

## Features

- Supabase email/password sign-up, sign-in, and sign-out
- Per-user data isolation using Postgres row-level security
- Automatically seeded sample accounts and transaction history
- Dashboard balances, account list, transaction history, and categories
- Atomic transfers between a user's own accounts in the prototype
- Synthetic account and invalid routing details for realistic-looking previews
- Role-protected admin console for account balance, transaction-state, and
  customer-notice management with an audit log
- Persistent light/dark theme preference and responsive navigation
- Email notifications for sign-up account details, transfer requests, and
  administrator status updates when a transactional email provider is configured
- Internal, ACH, same-day ACH, domestic wire, RTP, FedNow, and P2P transfer
  request flows (no payment rail is connected)
- Clear prototype disclosures and synthetic account details
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
   and the account-transfer database function.
3. Also run
   [`supabase/migrations/20261016010000_admin_and_demo_account_controls.sql`](./supabase/migrations/20261016010000_admin_and_demo_account_controls.sql).
   It adds randomly generated synthetic account numbers, the intentionally
   invalid `000000000` routing number, admin roles, audited balance adjustments,
   and admin transaction tools.
4. Run
   [`supabase/migrations/20261016020000_admin_transaction_lifecycle.sql`](./supabase/migrations/20261016020000_admin_transaction_lifecycle.sql).
   It adds audited pending, successful, on-hold, action-required, and failed
   states, along with customer-visible in-app notices. Successful transitions
   update example balances; other states do not.
   If the original schema and admin migrations have already been applied,
   apply the lifecycle and all following migrations.
5. Run
   [the transfer-rails migration](./supabase/migrations/20261016030000_simulated_transfer_rails.sql).
   It queues internal and external-style transfer requests as pending and
   applies matching balance changes atomically only after an administrator
   marks the transfer successful.
6. Run
   [`supabase/migrations/20261016040000_status_corrections_and_fresh_signup_data.sql`](./supabase/migrations/20261016040000_status_corrections_and_fresh_signup_data.sql).
   It enables audited status corrections with safe balance reconciliation and
   gives each new signup independently generated account numbers, masks, and
   starting balances. Existing accounts are not replaced.
7. Run
   [`supabase/migrations/20261016050000_external_institution_transfers.sql`](./supabase/migrations/20261016050000_external_institution_transfers.sql).
   It adds external-institution transfer requests. Requests remain pending
   until an administrator updates the status; only a successful status changes
   the sender's example balance. The complete recipient account number is
   discarded, and only its last four digits are retained for the prototype.
8. Run
   [`supabase/migrations/20261019000000_zero_new_account_defaults.sql`](./supabase/migrations/20261019000000_zero_new_account_defaults.sql).
   It changes starting account balances for new signups. Existing accounts are
   not changed.
9. Run
   [`supabase/migrations/20261020000000_recipient_routing_numbers.sql`](./supabase/migrations/20261020000000_recipient_routing_numbers.sql).
   It adds recipient routing-number validation for external transfer requests.
   Only the last four routing digits are retained. Existing requests remain
   readable without a routing number.
10. In Supabase **Project Settings → API**, copy the Project URL and the
   publishable key.
11. Copy `.env.example` to `.env.local`, then set:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   RESEND_API_KEY=your-resend-api-key
   EMAIL_FROM="First Grade Finance <notifications@your-verified-domain.example>"
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   APP_ROUTING_NUMBER=your-nine-digit-routing-number
   NEXT_PUBLIC_TAWK_PROPERTY_ID=your-tawk-property-id
   NEXT_PUBLIC_TAWK_WIDGET_ID=your-tawk-widget-id
   ```

   Get the Tawk.to property and widget IDs from the widget's embed-code URL.
   These public IDs enable the live chat widget; add them to the deployment
   environment and redeploy. If either ID is missing or the widget fails to
   load, the app displays a support availability message instead of silently
   ignoring chat requests.

   `APP_ROUTING_NUMBER` is optional and server-only. When set to a valid
   9-digit US routing number, it is shown as the app's routing number in account
   details. It does not route or initiate payments; no real payment rail is
   connected.

   Verify the sender domain with Resend. Keep `RESEND_API_KEY` and
   `SUPABASE_SERVICE_ROLE_KEY` server-side only: never use a `NEXT_PUBLIC_`
   prefix or commit real keys. The service-role key is used only during
   sign-up to read synthetic account details when email confirmation prevents
   a user-scoped read. Other application actions use the user-scoped key and
   database row-level security.

12. Configure email confirmations in Supabase **Authentication → Providers →
   Email**. If confirmation is enabled, account-detail email lookup uses the
   server-only service-role key; never expose this key to a browser or commit
   it. Transaction and status emails are sent through Resend only after the
   database operation succeeds. Delivery failures are reported in the UI and
   do not undo a saved prototype transaction.
13. For immediate local prototype sign-up, turn off email confirmations in
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
explore the prototype. Sign-up asks only for a name, email, and password. On
successful account creation, the database trigger creates three sample
accounts and sample transactions. Use **Internal transfer** to preview a
transfer; the example balances and transaction history persist in
Supabase. Choose **Another institution** to submit a fictional external
transfer request. It remains pending until an administrator updates its
status; a successful update changes the example balance, and status changes
and customer notices appear in the status view and transaction history.

## Enable the admin console

1. Sign up with the email address you want to use as the admin.
2. In the Supabase SQL Editor, promote only that account:

   ```sql
   update public.profiles
   set role = 'admin'
   where email = lower('your-admin-email@example.com');
   ```

   Confirm exactly one row was updated. Admin access is checked in server
   routes/actions and in the database. Never expose a service-role key or add
   a self-service admin role selector.
3. Sign out and back in. Admin sign-ins open `/admin` directly, and the
   **Admin Console** link is available in the desktop and mobile navigation.
   Visiting `/admin` as a regular user displays an access message instead of
   silently redirecting. Only a Supabase project owner can grant the role.
4. Create ordinary user accounts through the sign-up form to populate the
   admin's user list. Admin balance changes, transaction status transitions,
   customer-visible notices, and new transactions are recorded in an
   append-only admin audit log. Transaction emails contain only synthetic
   prototype information and the administrator's customer notice. A submitted
   transfer is shown as pending immediately; the status panel refreshes as an
   administrator changes its status and instructions.

Account numbers start with `FGF` and are examples. Routing number `000000000`
is intentionally invalid. Neither value can be used for ACH or real payments.

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
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the
hosting environment and apply all eight SQL migrations to the Supabase
project. This deployment remains a non-financial prototype; it is not a
production banking service and must not be presented as one. Configure the
Supabase Auth site URL and redirect URLs for the deployed
domain. Keep email confirmation enabled for any shared environment, and
configure the Resend sender and server-only secrets before relying on
account or transaction email notifications. No listed transfer method
connects to a payment network or moves money.

Sentry is optional. Set `NEXT_PUBLIC_SENTRY_DSN` to enable event reporting;
set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` as well to upload
source maps during the build.
