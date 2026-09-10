# Launch validation — 10 September 2026

This release closes the functionality gaps observed on the public app and adds regression coverage for failures found while preparing launch.

## Confirmed fixes

| Customer problem | Result and verification |
| --- | --- |
| Refresh erased a completed scan | Saved workspace restored the source, target role and the same real report after a browser refresh. |
| Saved resume links opened an empty scanner | Clicking “Scan this resume” created a workspace containing the selected resume. Detail view and tool reuse work; the downloaded TXT exactly matched its source. |
| Interview answers invented achievements | Answer outlines and a separate factual check replaced invented personal stories. The audited Morgan Lee input no longer produced the invented 30% result, Express.js, JWT or Postman claims. A numeric regression test rejects unsupported answer metrics before the verification call. |
| Application updates accepted invalid values | Live local-server requests rejected blank companies, non-HTTP URLs and malformed dates. Valid saves remain available. |
| Support messages had no usable operator workflow | Contact submissions return references; verified operators can list, handle and reopen requests. Ordinary accounts get 403 and cannot read the inbox. |
| Voice input failed during upload | Removed the incompatible native-fetch override from the SDK multipart transport. A real 14-second synthetic recording was transcribed and received relevant coaching. A local HTTP-server regression test exercises actual multipart serialization. |
| Portal cancellation was mislabeled | Account status now recognizes an explicit `cancel_at` as well as `cancel_at_period_end`. Browser portal cancellation and the account response were checked. |

## Payment verification

A disposable customer used the real Stripe **test-mode** custom checkout in the browser. A declined test card displayed a recoverable error. A successful test card completed checkout, activated Pro and opened the modern confirmation screen. The customer portal displayed the subscription and paid invoice; cancellation scheduled access to end at the billing boundary, as advertised.

Separately, a temporary public HTTPS endpoint received genuine Stripe test events. Durable database receipts and plan state were checked after subscription creation, paid renewal, failed renewal, recovery and cancellation. Failed renewal removed Pro; recovery restored it. A duplicate signed replay retained one receipt. Cancellation reversal and period-end cancellation also passed. Unlike the earlier local-forwarding test, initial event deliveries in this run originated from Stripe over the public Internet.

The temporary endpoint, customers, subscriptions, test clock, accounts and support fixture were removed. No live charge was made. These checks do not establish live card settlement, every wallet/device combination, tax configuration, disputes or real-world email inbox placement.

## Automated and AI checks

The final regression suite includes 89 tests with real disposable PostgreSQL for ownership, quotas, concurrent saves, billing transactions, history and support grants. Default tests use mocked provider responses; they do not incur payments or AI cost.

Separate funded checks exercised tailoring, a cover letter, nursing interview outlines, a source-bound edit, the audited engineering interview input, a real resume scan, and audio transcription/coaching. Their source-bound factual checks passed. AI remains probabilistic and users must review drafts; these samples are not a comprehensive benchmark.

Lint, typecheck, a production build and the dependency audit are required release checks. GitHub Actions runs the database tests without skips. Deployment-specific smoke results are recorded in the release runbook.

## Operations

The owner is configured as a support/app-health operator using a verified auth user ID. Operator privileges are server-side and do not come from editable user metadata. The support queue refreshes on focus and shows open counts on the account page; operators must monitor it and reply through their email app. Automatic notification email is not part of this workflow.

Branded production account email delivery and confirmation/recovery links were verified in the preceding setup. The receiving address previously advertised without verification has been removed in favor of the working contact form.

The production database retains owner-scoped readable tables. Their GraphQL schema visibility is intentional and does not bypass row ownership. Internal tables have no public grants or policies. The launch migration improves owner-policy evaluation and indexes billing ownership and the support queue. Leaked-password screening depends on the Supabase plan; the application requires 12-character passwords and does not claim that optional provider feature is enabled.
