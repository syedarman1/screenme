# Changelog

## 1.0.0 — 2026-09-10

Connected workspace launch.

### Added

- Saved workspaces across resume review, job comparison, tailoring, letters and interview preparation.
- Automatic draft recovery, ten completed-report snapshots, restoration and conflicting-edit detection.
- Source-preserving passage edits and a separate factual check for generated writing.
- Connected application workspaces, account/billing status and private tool activity.
- Readable saved resumes, TXT download and direct reuse in career tools.
- Operator-only support inbox with request references, pagination and handled/reopen controls.
- Branded account confirmation/recovery emails and verified production SMTP delivery.

### Fixed

- Completed scans disappearing after refresh.
- Saved-resume scan links opening an empty tool.
- Unsupported personal metrics and experience in generated writing.
- Application updates accepting blank company names, unsupported URLs or malformed dates.
- Resume rename/delete actions appearing successful when the server rejected them.
- Stale-edit feedback and failure/refund handling in connected workflows.
- Account cancellation status now recognizes explicit cancellation dates returned by the billing portal.
- Voice interview multipart uploads failing before transcription when sent through an incompatible transport.

### Engineering

- Additive PostgreSQL migrations with atomic storage limits, owner isolation, private monitoring and indexed support/billing lookups.
- Automated API and real-database regression coverage; separately documented funded AI and Stripe integration checks.
- GitHub product overview, architecture diagram, contribution/security guidance and structured issue templates.

## September 2026 — foundation updates

- V2 evidence-backed resume scanner and job matcher.
- Custom on-site Stripe checkout and modern Pro confirmation.
- Consistent Free/Pro limits and an updated dashboard.
- Signature-verified, transactional subscription fulfillment and retry-safe usage accounting.
