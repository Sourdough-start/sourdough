# Stripe Connect Integration Roadmap

Integrate Stripe Connect into Sourdough as an optional payment module, using Stripe-enforced application fees (1%) for platform monetization. Dual-licensed: core Sourdough stays MIT; `backend/app/Services/Stripe/` gets a Sourdough Commercial License requiring Connect or a paid license for direct Stripe usage.

## Architecture

- **Stripe Connect with destination charges** -- fork operators connect their Stripe account to the Sourdough platform; Stripe automatically collects 1% application fee at the payment processing level
- **Standard connected accounts** -- fork operators manage their own Stripe dashboard, disputes, and payouts (least operational burden for the platform)
- **SettingService-backed configuration** -- all Stripe keys stored via the existing database+env fallback pattern (encrypted, admin-only)
- **Usage tracking integration** -- payment events tracked via existing `UsageTrackingService` and visible in the Usage & Costs dashboard

## Phase 0: Platform Account Setup (Manual, One-Time)

Set up Sourdough as a Stripe Connect platform (done by the maintainer, not in code):

- [ ] Create/upgrade Stripe account with identity verification
- [ ] Enable Stripe Connect (Platform or Marketplace, Standard accounts)
- [ ] Configure platform branding (name, icon, color, website URL)
- [ ] Configure OAuth settings (Platform Client ID, redirect URIs)
- [ ] Note platform credentials (account ID, secret key, publishable key, client ID)
- [ ] Set up webhook endpoint for platform events
- [ ] Test in test mode first

## Phase 1: Core Backend (Stripe Service Layer)

- [ ] Add `stripe/stripe-php` dependency
- [ ] Add `stripe` group to `backend/config/settings-schema.php` (enabled, keys, connect, fee %, currency)
- [ ] Create `backend/config/stripe.php` config file (with platform_account_id, platform_client_id defaults)
- [ ] Add `injectStripeConfig()` to `ConfigServiceProvider`
- [ ] Create `backend/app/Services/Stripe/StripeService.php` (payment intents, customers, refunds)
- [ ] Create `backend/app/Services/Stripe/StripeConnectService.php` (account creation, account links, status)
- [ ] Create `backend/app/Services/Stripe/StripeWebhookService.php` (event handling, signature verification)
- [ ] Create `payments` and `stripe_customers` migrations
- [ ] Create `Payment` and `StripeCustomer` models
- [ ] Add `PAYMENTS_VIEW`, `PAYMENTS_MANAGE` to `Permission` enum

## Phase 2: Webhook Handling

- [ ] Create `StripeWebhookController` (public route, signature verification, delegates to service)
- [ ] Add `POST /webhooks/stripe` route (no auth middleware)
- [ ] Handle: payment_intent.succeeded, payment_intent.payment_failed, charge.refunded, account.updated, account.application.deauthorized

## Phase 3: Connect Onboarding

- [ ] Create `StripeConnectController` (status, create account, account links, login links, disconnect)
- [ ] Add Connect routes under `stripe/connect` prefix (settings.edit permission)
- [ ] Add Connect callback route (`GET /stripe/connect/callback`)

## Phase 4: Stripe Settings + Payment API

- [ ] Create `StripeSettingController` (show, update, test connection, delete key)
- [ ] Create `StripePaymentController` (index, show, create intent, admin index)
- [ ] Add settings and payment routes

## Phase 5: Frontend

- [ ] Add `@stripe/stripe-js` and `@stripe/react-stripe-js` npm dependencies
- [ ] Create Stripe config page (`/configuration/stripe`) with API Keys, Connect, and Settings sections
- [ ] Create payment history page (`/configuration/payments`)
- [ ] Add "Payments" navigation group to configuration layout
- [ ] Create `frontend/lib/stripe.ts` utility (getStripe, useStripe hook)

## Phase 6: Usage Tracking Integration

- [ ] Instrument `StripeService` with `UsageTrackingService::record()` for payment_processed and refund_processed
- [ ] Add `budget_payments` to usage settings schema

## Phase 7: Licensing

- [ ] Create `backend/app/Services/Stripe/LICENSE.md` (Sourdough Commercial License)
- [ ] Update root `LICENSE` to reference dual-license model
- [ ] Update `FORK-ME.md` with Payments section

## Phase 8: Documentation

- [ ] Create ADR-026: Stripe Connect Integration
- [ ] Create recipes: setup-stripe, add-payment-flow, add-stripe-subscription, handle-stripe-webhooks, stripe-connect-onboarding
- [ ] Create patterns: stripe-service, stripe-webhooks
- [ ] Update context-loading.md and README.md with Payments/Stripe task type
- [ ] Add help articles and search entries
- [ ] Add Stripe to Integration Costs table
- [ ] Add Stripe env vars to .env.example

## Phase 9: Fork Connect Onboarding

- [ ] Build 3-state Connect UI (Not Connected, Pending, Active) in Stripe config page
- [ ] Implement Connect callback handling (frontend query params + backend redirect)
- [ ] Create fork operator onboarding recipe (stripe-connect-onboarding.md)
- [ ] Document platform visibility (what the maintainer sees in Stripe Dashboard)

## Key Files (When Complete)

**Backend:**
- `backend/config/stripe.php`
- `backend/app/Services/Stripe/StripeService.php`
- `backend/app/Services/Stripe/StripeConnectService.php`
- `backend/app/Services/Stripe/StripeWebhookService.php`
- `backend/app/Http/Controllers/Api/StripeSettingController.php`
- `backend/app/Http/Controllers/Api/StripeConnectController.php`
- `backend/app/Http/Controllers/Api/StripeWebhookController.php`
- `backend/app/Http/Controllers/Api/StripePaymentController.php`
- `backend/app/Models/Payment.php`
- `backend/app/Models/StripeCustomer.php`

**Frontend:**
- `frontend/app/(dashboard)/configuration/stripe/page.tsx`
- `frontend/app/(dashboard)/configuration/payments/page.tsx`
- `frontend/lib/stripe.ts`

**Documentation:**
- `docs/adr/026-stripe-connect-integration.md`
- `docs/ai/recipes/setup-stripe.md`
- `docs/ai/recipes/add-payment-flow.md`
- `docs/ai/recipes/add-stripe-subscription.md`
- `docs/ai/recipes/handle-stripe-webhooks.md`
- `docs/ai/recipes/stripe-connect-onboarding.md`
- `docs/ai/patterns/stripe-service.md`
- `docs/ai/patterns/stripe-webhooks.md`
