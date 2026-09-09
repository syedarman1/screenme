# Connected workflow release notes

This branch adds saved career workspaces, reviewed edits, verified writing tools, connected applications, account/billing status, and first-party AI monitoring. Both stages are audited in `enhancement-audits.md`.

## Deployment order

1. Apply `20260909224003_saved_review_workspaces.sql`, then `20260909230228_connected_applications_and_monitoring.sql` to the target Supabase project through the migration workflow. These are additive; existing applications and resumes remain intact. Run Supabase database lint and security/performance advisors on the target project.
2. Configure `RESUME_AI_MODEL=gpt-5.6-terra`. Configure `SCREENME_OPERATOR_IDS` with the verified auth user IDs of operators who may view aggregate app health; leave it empty to deny aggregate access. Ordinary accounts see their own activity only.
3. Deploy the application. Verify the owner-only workspace endpoints, restore behavior, account page and tool feedback using a temporary account.
4. Verify the public Stripe endpoint and email sender as described below before calling the full account lifecycle production-ready. The development tests use a separate local database and do not establish live delivery.

## Email activation

Resend supports Supabase custom SMTP and offers a free tier. It was not available in the Stripe Projects catalog checked on 2026-09-09, so it has not been provisioned through Projects. The browser currently requires a Resend sign-in. DNS for screenme.dev uses Vercel nameservers.

After connecting the Resend account, verify a sending domain using the exact DNS records Resend supplies. Do not invent DKIM or SPF values, replace existing MX records, or add duplicate SPF records. A transactional sender such as accounts@screenme.dev does not require purchasing a mailbox. Receiving replies is a separate mailbox/forwarding concern.

Configure Supabase Auth custom SMTP: host `smtp.resend.com`, port `465`, username `resend`, API key as the password, sender name `ScreenMe`, verified sender email. Store the SMTP secret in Supabase, not a browser variable or source file. Install `supabase/templates/confirmation.html` and `recovery.html`; keep link tracking disabled for auth links. Configure production site URL and exact `/dashboard` and `/reset-password` redirect URLs. Enable confirmation. Turn `NEXT_PUBLIC_EMAIL_DELIVERY_ENABLED=true` on only after a real signup and recovery email reach the owner's selected test inbox; redeploy because this flag is compiled into the client.

Local validation: `scripts/test-local-auth.ts` exercises signup confirmation, login restrictions, recovery, password replacement, old-password rejection and one-use links through Supabase and Mailpit. It refuses a non-local database. It requires Mailpit on port 56324 and confirmation enabled in the isolated local stack. No external mail was sent during this audit.

References: [Resend SMTP for Supabase](https://resend.com/docs/send-with-supabase-smtp), [Resend free-tier limits](https://resend.com/pricing), [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## Billing activation and verification

The configured Stripe test account had no registered webhook endpoints during this audit. Register `/api/stripe/webhook` at the deployed canonical HTTPS origin in the intended Stripe environment and store its matching signing secret in a sensitive server environment variable. Verify that secret, price, publishable key, restricted/server key and portal configuration all belong to the same environment. Use a restricted key with the permissions this integration needs where possible.

Required events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_succeeded`, `invoice.payment_failed`. Replay a genuine event through Stripe to verify public delivery, signature validation, durable receipt and entitlement update. The success-page reconciliation remains a fallback; it does not replace webhooks for renewals and cancellations.

`scripts/test-local-billing.ts` passed against Stripe's real test API: paid activation, deduplication, renewal, failed renewal, recovery, scheduled cancellation, reversal, and period-end cancellation. It requires a local database and a Stripe test account with no external webhook endpoints. Real events are signed and forwarded to the local endpoint; this explicitly does not test public delivery. It creates and deletes its own test clock, customer, subscription and local account. No real charge occurs. Use an isolated sandbox for subsequent tests once an external webhook destination is configured.

Tax remains a separate configuration decision. Do not enable automatic tax on the assumption it establishes a registration; verify applicable registrations before enabling collection. Existing tax behavior was not changed.

Reference: [Stripe billing simulations](https://docs.stripe.com/billing/testing/test-clocks).

## Monitoring and data

`ai_runs` stores account ID, tool, model, response status, elapsed time, token counts, estimated known model cost and an optional helpfulness vote. No document, prompt, generated text, email or free-text error columns exist. Only the server can access the table. The operator API returns aggregates rather than individual accounts' records. Deleting an auth account cascades its monitoring records. The activity view covers 30 days; this is a display window, not an automatic retention policy.

Costs use the uncached gpt-5.6-terra rate snapshot from 2026-09-09 ($2/million input, $12/million output). Unknown models, audio and failed provider calls can be unpriced. Estimates are not invoices. Writer and factual-check calls are counted separately. Infrastructure costs, network outages before a reservation, and processes terminated before a monitoring write are not fully represented. Monitoring writes are bounded to two seconds and cannot turn a successful result into an error.

Saved tool workspaces are capped atomically at Free 3 / Pro 20 across all tools. Each keeps at most ten distinct completed-report snapshots. Existing saved work remains readable/editable/downloadable when an AI allowance is depleted or the plan downgrades. Server-side reservations still gate every AI call. Deleting an application detaches its saved work; it does not delete those documents. The privacy notice documents the new storage.

## Validation commands

Use Node 22.13 or later within the supported Node 22 range, install locked dependencies, and run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. The database tests require `SCREENME_TEST_DB` naming a disposable Docker PostgreSQL container prefixed `codex-screenme-`; they reset only that fixture database. All 82 tests ran without skips locally. Run the two integration scripts with the isolated development environment file. Never use production Supabase credentials for them.
