# Connected workflow release notes

This branch adds saved career workspaces, reviewed edits, verified writing tools, connected applications, account/billing status, and first-party AI monitoring. Both stages are audited in `enhancement-audits.md`.

## Deployment order

1. Apply `20260910044842_saved_review_workspaces.sql`, then `20260910044844_connected_applications_and_monitoring.sql`, then `20260910044845_launch_readiness.sql`, then `20260910045000_workspace_relation_indexes.sql` to the target Supabase project through the migration workflow. These are additive; existing applications and resumes remain intact. Run Supabase database lint and security/performance advisors on the target project.
2. Configure `RESUME_AI_MODEL=gpt-5.6-terra`. Configure `SCREENME_OPERATOR_IDS` with the verified auth user IDs of operators who may view aggregate app health; leave it empty to deny aggregate access. Ordinary accounts see their own activity only.
3. Deploy the application. Verify the owner-only workspace endpoints, restore behavior, account page and tool feedback using a temporary account.
4. Verify the public Stripe endpoint as described below before calling billing lifecycle delivery production-ready. Live email sender and auth-link checks passed separately; the development billing tests do not establish public webhook delivery.

## Email activation

Completed on 2026-09-09 using the owner's Resend account. The screenme.dev domain is verified. Vercel DNS now contains Resend's exact DKIM, send-subdomain SPF and MX records, plus a monitoring-only DMARC policy. Existing website records were preserved; incoming email was not enabled. Link/open tracking remains unconfigured and TLS is enforced.

Production Supabase project `eqgmogtnibarwvmiywcv` now uses custom SMTP: host `smtp.resend.com`, port `465`, username `resend`, sender `ScreenMe <accounts@screenme.dev>`. Its dedicated Resend key has sending-only access restricted to screenme.dev and is stored in Supabase. The temporary onboarding key was revoked; scratch credentials and test sessions were removed. No secret is stored in this repository. Supabase retains its 60-second per-user interval and 30-email/hour SMTP rate limit.

Installed `supabase/templates/confirmation.html` and `recovery.html` with branded subjects. Email confirmation was already required. Real delivered links were verified to redirect to the canonical `/dashboard` and `/reset-password` routes. `NEXT_PUBLIC_EMAIL_DELIVERY_ENABLED=true` is active in Vercel Production. Deployment `dpl_13AdhuRo67AaMfvM1Eo1MTe6Qbkn` rebuilt the existing production app and is Ready at https://www.screenme.dev/. A live browser check confirmed the email signup and password-reset controls are enabled. This configuration release does not deploy the connected-workflow feature branch or its migrations.

Live validation: Resend recorded delivery of the first onboarding email, a branded sender test, and actual Supabase signup and recovery emails to the owner's Gmail inbox (the auth tests used a plus-address alias). The delivered confirmation link issued a session. The delivered recovery link issued a recovery session, accepted a new password, rejected the old password, allowed the new password, and rejected link reuse. The temporary auth account was removed after revoking its sessions. These are API-level auth and provider-delivery checks; Gmail inbox-versus-spam placement was not inspected.

Local validation remains available through `scripts/test-local-auth.ts`, which refuses a non-local database and uses Mailpit. Do not point that local integration script at production. Receiving replies at accounts@screenme.dev still requires a separate mailbox or forwarding setup.

References: [Resend SMTP for Supabase](https://resend.com/docs/send-with-supabase-smtp), [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## Billing activation and verification

At the earlier stage-two audit, the configured Stripe test account had no registered webhook endpoints. The launch audit subsequently verified genuine public delivery through a temporary HTTPS endpoint; see `launch-validation.md`. Production already has an enabled canonical webhook with the eight events below. Register `/api/stripe/webhook` at the deployed canonical HTTPS origin in the intended Stripe environment and store its matching signing secret in a sensitive server environment variable. Verify that secret, price, publishable key, restricted/server key and portal configuration all belong to the same environment. Use a restricted key with the permissions this integration needs where possible.

Required events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_succeeded`, `invoice.payment_failed`. Replay a genuine event through Stripe to verify public delivery, signature validation, durable receipt and entitlement update. The success-page reconciliation remains a fallback; it does not replace webhooks for renewals and cancellations.

`scripts/test-local-billing.ts` passed against Stripe's real test API: paid activation, deduplication, renewal, failed renewal, recovery, scheduled cancellation, reversal, and period-end cancellation. It requires a local database and a Stripe test account with no external webhook endpoints. Real events are signed and forwarded to the local endpoint; this explicitly does not test public delivery. It creates and deletes its own test clock, customer, subscription and local account. No real charge occurs. Use an isolated sandbox for subsequent tests once an external webhook destination is configured.

Tax remains a separate configuration decision. Do not enable automatic tax on the assumption it establishes a registration; verify applicable registrations before enabling collection. Existing tax behavior was not changed.

Reference: [Stripe billing simulations](https://docs.stripe.com/billing/testing/test-clocks).

## Monitoring and data

`ai_runs` stores account ID, tool, model, response status, elapsed time, token counts, estimated known model cost and an optional helpfulness vote. No document, prompt, generated text, email or free-text error columns exist. Only the server can access the table. The operator API returns aggregates rather than individual accounts' records. Deleting an auth account cascades its monitoring records. The activity view covers 30 days; this is a display window, not an automatic retention policy.

Costs use the uncached gpt-5.6-terra rate snapshot from 2026-09-09 ($2/million input, $12/million output). Unknown models, audio and failed provider calls can be unpriced. Estimates are not invoices. Writer and factual-check calls are counted separately. Infrastructure costs, network outages before a reservation, and processes terminated before a monitoring write are not fully represented. Monitoring writes are bounded to two seconds and cannot turn a successful result into an error.

Saved tool workspaces are capped atomically at Free 3 / Pro 20 across all tools. Each keeps at most ten distinct completed-report snapshots. Existing saved work remains readable/editable/downloadable when an AI allowance is depleted or the plan downgrades. Server-side reservations still gate every AI call. Deleting an application detaches its saved work; it does not delete those documents. The privacy notice documents the new storage.

## Validation commands

Use Node 22.13 or later within the supported Node 22 range, install locked dependencies, and run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. The database tests require `SCREENME_TEST_DB` naming a disposable Docker PostgreSQL container prefixed `codex-screenme-`; they reset only that fixture database. The launch suite has 89 tests; run all of them without skips against the disposable database. Run the two integration scripts with the isolated development environment file. Never use production Supabase credentials for them.


## Public webhook integration runner

`scripts/test-public-billing.ts` requires Stripe test credentials, a local Supabase database, and one temporary `trycloudflare.com` webhook destination. Store only the endpoint ID and origin in a private JSON state file (`{"origin":"https://your-temporary-host.trycloudflare.com","webhookId":"we_..."}`), and point `SCREENME_QA_STATE` to it. Configure the app with that endpoint's signing secret before starting the runner. It creates and removes its own subscription test clock/customer and local account; the operator must remove the temporary destination and stop the tunnel afterward. Never use production keys/database values. Browser checkout testing is separate from the clock simulation.

## Launch operations

`/support` is restricted to verified IDs in `SCREENME_OPERATOR_IDS`; the owner can reach it from Account and membership. The page lists new and handled requests, links a reply in the operator's email app, and supports handling/reopening. Check it regularly. The public form returns a reference after durable storage and no longer advertises an unverified receiving mailbox. No automatic support notifications are sent.

Set an explicit `STRIPE_PORTAL_CONFIGURATION` from the live account, with invoice history, payment-method updates and cancellation at period end enabled. Keep live/test keys, prices and portal configuration in matching modes. The account view recognizes both cancellation flags and explicit cancellation timestamps.
