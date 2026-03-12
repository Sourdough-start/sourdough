# Stripe Connect Removal & Simplification - March 11, 2026

## Overview

Removed Stripe Connect (destination charges, platform fees, OAuth onboarding) and simplified to plain Stripe payments. Reverted from dual MIT+Commercial license to pure MIT. Added feature gating so Stripe nav items only appear when enabled.

## Motivation

Stripe Connect added complexity (OAuth flows, connected accounts, platform fee calculation) that wasn't justified for the project's needs. The commercial license tied to Connect created friction for fork operators. Plain Stripe covers the payment use case without the platform monetization layer.

## Changes Made

### Deleted (7 files)
- `backend/app/Services/Stripe/StripeConnectService.php`
- `backend/app/Services/Stripe/LICENSE.md` (commercial license)
- `backend/app/Http/Controllers/Api/StripeConnectController.php`
- `backend/app/Http/Controllers/StripeConnectCallbackController.php`
- `backend/tests/Unit/StripeConnectServiceTest.php`
- `backend/tests/Unit/StripeConnectControllerTest.php`
- `backend/tests/Unit/StripeConnectCallbackControllerTest.php`
- `docs/ai/recipes/stripe-connect-onboarding.md`

### Modified - Backend
- **StripeService**: `isEnabled()` now checks `stripe.enabled` AND `secret_key`; `createPaymentIntent()` removed `connected_account_id`, `application_fee_amount`, `transfer_data`
- **StripeWebhookService**: Removed `account.updated` and `account.application.deauthorized` handlers
- **ConfigServiceProvider**: Removed Connect config injection (platform_account_id, platform_client_id, etc.), added `enabled`
- **config/stripe.php**: Simplified to 6 keys (enabled, secret_key, publishable_key, webhook_secret, currency, mode)
- **settings-schema.php**: Stripe group reduced from 11 to 6 settings; added `enabled` with `public: true`
- **Routes**: Removed 6 Connect routes and OAuth callback route
- **Controllers**: Removed Connect dependencies from StripeSettingController and StripePaymentController
- **SystemSettingController**: Added `stripe_enabled` to public features

### Modified - Frontend
- **stripe/page.tsx**: Complete rewrite (~260 lines, down from ~600), removed Connect section
- **stripe.ts**: Removed `ConnectStatus` interface and Connect fields from `StripeSettings`
- **layout.tsx**: Added `featureFlag: "stripe"` to Stripe and Payment History nav items
- **app-config.tsx**: Added `stripeEnabled` to AppConfigFeatures

### Modified - Docs & License
- **LICENSE**: Removed dual-license section, now pure MIT
- **ADR-026**: Renamed and rewritten for plain Stripe
- Updated 8 doc files (context-loading, recipes, patterns, roadmaps, API README, etc.)

## Feature Gating Pattern

Followed the existing Novu/GraphQL pattern:
1. `settings-schema.php`: `'enabled' => ['default' => false, 'public' => true]`
2. `SystemSettingController`: Added to public features array
3. `app-config.tsx`: Extract `stripeEnabled` from features
4. `layout.tsx`: `featureFlag: "stripe"` on nav items + `stripe: features?.stripeEnabled ?? false` in featureFlags map

## Test Fix

Tests needed `config(['stripe.enabled' => true])` added to the helper and individual test cases since `isEnabled()` now checks both the enabled flag and secret key presence.

## Related
- [ADR-026: Stripe Integration](../adr/026-stripe-integration.md)
- [Roadmaps](../roadmaps.md) (marked as complete)
