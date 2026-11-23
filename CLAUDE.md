# DOORS — Engineering Directive (authoritative)

> Read this file before ANY work on DOORS. It is the master engineering directive
> issued by the DOORS owner on 2026-11-22 and it overrides convenience, speed and
> any older habit. If a request conflicts with it, stop and ask.

## Project facts

- **Product:** Doorsteps Logistics (**DOORS**, short form; "Doorsteps" is also correct). Food & grocery ordering + delivery (and waybill) around ESUT, Agbani, Enugu State, Nigeria.
- **Launch:** 6 December 2026. Pre-launch landing page: `/join`. Live site: https://www.doorsteps.com.ng (apex redirects to `www`).
- **Stack:** Next.js 16 (App Router, single-page "screens" app in `lib/store.tsx` + `components/app/app-shell.tsx`), Tailwind v4, Supabase (Postgres + Auth + Storage), Vercel. pnpm lockfile v9 (edit it carefully; don't let a newer pnpm rewrite it).
- **Supabase project:** `baskdegavbbysopgoetv` (production). There is no separate dev database. Treat every query as production.
- **Env:** `APP_SUPABASE_URL`, `APP_SUPABASE_PUBLISHABLE_KEY` (+ `NEXT_PUBLIC_` copies). The app has **no service-role key**. Never add one to frontend code.
- **Contacts (approved):** 0701 803 8264, 0704 408 9677. Never invent contact details, stats, testimonials, partners or locations.

## 1. Launch-stabilization mode (until launch)

Stability > speed. Fix critical bugs, security, data integrity, existing functionality, mobile usability.
Do NOT: add unrequested features, redesign UI, refactor, swap working components, add dependencies,
touch unrelated files, or turn a bug fix into a rewrite. If a major change is truly needed, explain
reasons, risks, alternatives and impact first, and wait for approval.

## 2. Non-negotiable rules

- **Never remove, bypass or weaken authentication to fix an auth/navigation bug.** Protected screens stay protected; "auth still loading" is not "logged out"; logout really ends the session; Back after logout must not reveal protected data; browser flags/localStorage are never proof of auth.
- **Never disable RLS or widen policies to fix a permission error.** Diagnose the query/policy.
- **Never expose secrets** (service-role key, passwords, tokens) in code, logs, commits or screenshots. Report any exposure immediately.
- **Fix root causes, not symptoms.** Never ship fake functionality or fake success messages.
- **Frontend, server actions and DB must agree** (table/column names, types, constraints).

## 3. Database standards (Supabase/Postgres)

- Inspect before changing: tables, columns, types, PK/FK, constraints, indexes, functions, triggers, views, RLS, existing data, and the app queries that use them.
- Relational integrity: proper PK/FK, unique/check constraints, nullability. No orphans. The DB enforces critical rules, not just the frontend.
- Sensible normalization; deliberate denormalization only with a reason (e.g. order_items keep the item name/price at purchase time).
- Types: money = exact `numeric` (NGN), never float; `timestamptz`; controlled status values; Nigerian phone numbers normalized; timezone Africa/Lagos.
- Performance: indexes for real query patterns (FKs, status, created_at, lookups), pagination/bounded queries, no N+1, no needless realtime subscriptions. Don't index blindly.
- Orders/payments: atomic (one transaction or DB function), idempotent against retries/double taps, totals computed server-side, payment verified server-side (never trust a frontend "paid").
- Migrations: versioned SQL files in `supabase/migrations/`, additive and reversible where possible, header states APPLIED/NOT APPLIED. Confirm the backup/recovery situation before significant changes.

### Requires the owner's explicit approval (never do on your own)

Dropping tables/columns with data, bulk deletes or rewrites, resetting/replacing the schema, deleting users/orders/vendors/deliveries, any destructive SQL, disabling RLS, weakening production security settings. Also ask before deleting even test rows or running test transactions against production (the owner has declined these before).

## 4. Required workflow for every significant task

1. **Inspect** code, config, DB.
2. **Diagnose** the real root cause (no guessing).
3. **Plan** the smallest safe change and list side effects, security and regression risks.
4. **Protect** existing data, auth and functionality.
5. **Implement** minimally, with no unrelated edits.
6. **Test**: build, `tsc`, runtime/console errors, the feature end to end, DB records/permissions/failure states.
7. **Regression check** connected features (shared components, global state, auth, routing, DB functions, payments, layouts).
8. **Review** the diff for accidental deletions, unrelated changes and security gaps.
9. **Report** using the format below.

Never claim a test passed unless it actually ran. Say clearly what could not be tested.

### Auth regression checklist (run whenever auth, routing, sessions or navigation change)

1. Fresh login
2. Refresh while logged in
3. Navigating between screens
4. Mobile/browser Back
5. Reopening the browser (session restored)
6. Visiting a protected screen while logged out
7. Logout
8. Visiting a protected screen after logout (including via Back)
9. Password recovery
10. Session expiry (where practical)

## 5. Product quality

- No blank screens, endless loading, silent failures, lost input, duplicate orders, misleading payment or auth messages, raw SQL errors or stack traces.
- Every important action has loading, success and error states with a recovery path.
- Mobile-first: test Back, refresh, forms, cart and checkout on phone widths.
- Handle unstable networks: no infinite retries, no duplicate submissions, never confirm success the server didn't confirm.
- Ask the owner before shipping any preset/factual lists (areas, categories, addresses). Waitlist areas are owner-edited via Admin → Pre-launch sign-ups → Form choices.

## 6. Git & change management

Inspect the working tree first, never overwrite others' work, and branch from the latest `origin/main`. Keep each commit to one task. Don't push to `main` directly; open a PR. Don't revert the whole project on an error. Find the faulty change.

## 7. Report format (after every significant task)

TASK · ROOT CAUSE · SOLUTION IMPLEMENTED · FILES MODIFIED · DATABASE CHANGES · SECURITY IMPACT · TESTS PERFORMED · RESULTS · REGRESSION CHECK · REMAINING ISSUES · LAUNCH IMPACT. Be honest, and don't hide failures.

## 8. Priority order

Data safety → security → authentication → DB integrity → existing functionality → stability → regression prevention → reliability → customer experience → mobile → maintainability → performance → scalability → speed.

**INSPECT FIRST. DIAGNOSE ACCURATELY. PLAN SAFELY. IMPLEMENT MINIMALLY. PROTECT THE DATABASE. TEST THOROUGHLY. VERIFY THE RESULT. REPORT HONESTLY.**

---

## Current status (audit of 2026-11-22, `main` @ 7b6eae4). Update as issues are resolved.

**Authentication (read-only review, nothing changed):**
- Sign-in state comes from the server (`getCurrentProfile` → `supabase.auth.getUser()` with cookies). No localStorage auth flags. Data is protected server-side (role re-checks in server actions + RLS).
- PR #33 (`8f93907`) mirrored screens into browser history and made signed-in users skip the intro and login on reload. That is intended session persistence, not an auth bypass. Logout (`useSignOut`) calls `supabase.auth.signOut()`, clears SWR and hard-reloads to `/?auth=login`.
- Gaps to fix (need approval):
  - After logout, Back can re-show a protected *screen* shell. The data stays blocked and the screen shows "You don't have access" instead of sending the user to login.
  - Profile screen is reachable signed-out and shows placeholder data (hardcoded phone "+234 803 555 0192").
  - The splash waits for the auth check (good), but other screens don't gate on `authChecked`.
- Password reset: the implicit-flow fix is live. The owner must set Supabase Auth Site URL to `https://www.doorsteps.com.ng` and add `https://www.doorsteps.com.ng/**` and `https://doorsteps.com.ng/**` to Redirect URLs.

**Database:** RLS is on for all 14 public tables. Money columns are `numeric`. Open items:
- ~~Order creation is two separate inserts~~ → **fixed 2026-11-22.** The atomic, idempotent `public.place_order(jsonb)` (SECURITY INVOKER; all RLS and guards apply) and `public.current_delivery_fee()` are applied. The app uses them once PR #37 is merged. Migration: `supabase/migrations/20261122_safe_order_placement.sql`.
- Foreign keys are in place (orders → vendors/profiles/auth.users, order_items → orders/menu_items, profiles → auth.users, etc.).
- Advisors:
  - leaked-password protection is off (dashboard toggle)
  - `set_rider_earning` has a mutable search_path
  - trigger-only functions (`handle_new_user`, `order_items_guard`, `order_items_recalc`) are callable via the public API (should be revoked)
  - `payment_events`, `approved_roles` and `site_settings` have RLS but no policies (safe, deny-all)
- Test rows from the 2026-11-21 form tests remain in `waitlist_signups`, `rider_applications` and `vendor_applications`. The owner declined deletion.
- Pending, not applied: `supabase/migrations/20261119_dashboard_foundation.sql` (all sections except 3).

---

## Proactive product engineering (owner directive, 2026-11-22)

- Act as a product & engineering partner: proactively identify standard delivery-platform features DOORS is missing, failure scenarios (double taps, refresh/Back, offline, expired session, payment succeeded but UI errored, unsupported browser, device change) and mobile UX problems. Don't wait to be asked.
- Prioritise: **P0** critical before launch (security, auth, ordering, checkout, payments, DB integrity, crashes, broken navigation) → **P1** high-value launch features (installable PWA, notification centre, web push for real order events, mobile polish, offline fallback, recovery) → **P2** post-launch.
- **PWA:** real manifest + service worker + offline fallback + a tasteful "Get DOORS on your phone" prompt (native `beforeinstallprompt`; iOS Add-to-Home-Screen steps; shown after real engagement; never during checkout/payment/login/active order; dismissal respected; hidden once installed). Never cache auth, orders, prices or private data.
- **Push notifications:** genuine web push (service worker + VAPID + backend) for real order events only; no private data in messages; ask permission after a clear reason (e.g. after placing an order), never on landing; app works if declined; subscriptions tied to the user, removed on logout/expiry; failures logged.
- **Notification centre:** bell, unread count, list, read/unread, mark-all-read, persisted and RLS-protected (own notifications only), linked to orders; works with push.
- **System states everywhere:** loading, empty, success, failure, offline, retry, session restore, network recovery, duplicate prevention.
- Never simulate a feature (a visual Install button or in-page alert is not PWA/push).
- Authorised: safe, isolated, non-destructive improvements without asking each time. Approval still required for DB migrations, new secrets/env vars, new infrastructure dependencies, auth/security changes and anything risky.

### Feature audit & priorities (2026-11-22)

**P0, critical.** ⚠️ Ordering is **ON** in production (`site_settings.orders_open = true`, checked 2026-11-22). As of then, all 5 real orders were cash on delivery.
1. Checkout "Debit Card" collects card number/expiry/CVV and places the order **without charging**. It's fake payment and a card-data security violation. **Fix in PR #37** (card hidden and refused by the DB until Paystack is integrated; the owner chose Paystack).
2. Checkout "Bank Transfer" showed "Moniepoint • 8123 4567 89", which looks like a placeholder. **Hidden in PR #37.** The owner's account number is 3001422614; bank name and account name are still needed. The owner chose manual transfer confirmed by an admin.
3. Order creation wasn't atomic or idempotent. **Fixed:** `place_order()` is applied in production and tested (rollback test); the app side is in PR #37.
4. Support chat shows a fake auto-reply ("One of our agents will assist you shortly") but nothing is sent anywhere.
5. Profile shows fake data ("+234 803 555 0192", "Payment methods: 2 cards") and is reachable signed-out.
6. Notifications screen has a "Mark all read" button that does nothing (always empty).

**P1:** installable PWA + install prompt + offline fallback (in progress) · notification centre (needs a `notifications` table) · web push for order events (needs VAPID keys in Vercel env, a `push_subscriptions` table, the `web-push` dependency and a secure server-side sender) · auth gaps from the audit above.

**P2:** saved addresses, reorder, ratings/reviews, promo codes, vendor opening hours/closed state, analytics, recommendations.
