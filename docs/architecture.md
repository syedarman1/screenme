# Architecture and engineering decisions

## Engineering highlights

- **Evidence provenance:** resume and job text are segmented into numbered source passages. The response schema restricts model-selected evidence to those passage IDs; the server resolves references back to original text. This prevents fabricated citation text while leaving the model's interpretation subject to review.
- **Runtime validation:** Zod schemas and application validators check response structure, evidence/status consistency, duplicate requirements, and input bounds. A versioned request header rejects stale analysis clients rather than returning an incompatible payload.
- **Deterministic scoring:** job requirement coverage is computed in application code using explicit weights: required = 3, unspecified = 2, preferred = 1; supported = full credit, partial = half, not evidenced = zero. The result measures documented coverage of extracted requirements.
- **Concurrency control:** authenticated AI routes reserve allowance through database transactions before provider work. Successful requests settle reservations; failures refund them. Database-backed limits coordinate requests across application instances.
- **Idempotent billing:** webhook signatures authenticate payment events. Delivery receipts and entitlement changes commit atomically, and the handler retrieves current subscription state to accommodate delayed or out-of-order events.
- **Authorization boundaries:** saved-record writes use authenticated server routes, while owner-scoped reads and database policies constrain access. Plan-aware database triggers serialize saves against account limits.
- **Failure-oriented tests:** the suite covers duplicate payment delivery, rollback, concurrent quota use, cross-account isolation, evidence rejection, PDF extraction, and private-network URL rejection.

## Code map

| Area | Entry points |
| --- | --- |
| Analysis orchestration | [analysisEngine.ts](src/app/lib/analysisEngine.ts), [analysisEvidence.ts](src/app/lib/analysisEvidence.ts), [analysisV2.ts](src/app/lib/analysisV2.ts) |
| Request lifecycle | [aiRequest.ts](src/app/lib/aiRequest.ts), [auth.ts](src/app/lib/auth.ts), [rate-limit.ts](src/app/lib/rate-limit.ts) |
| Billing | [billing.ts](src/app/lib/billing.ts), [webhook route](src/app/api/stripe/webhook/route.ts) |
| Persistence and invariants | [Schema baseline](supabase/schema-baseline.sql), [migrations](supabase/migrations) |
| Verification | [Tests](tests), [CI workflow](.github/workflows/ci.yml), [analysis evaluation](scripts/evaluate-analysis-v2.ts) |

## Design tradeoffs

Source-reference validation guarantees that displayed evidence comes from the input; it does not prove that every model interpretation is correct. Job coverage is a document-comparison metric, not a hiring probability or ATS certification. PDF extraction preserves text boundaries but does not perform OCR or reconstruct visual layout.

Automated provider fixtures test application behavior. The opt-in live evaluation suite separately checks output quality on synthetic cases; it uses a funded API project and is not part of ordinary offline tests. See [analysis tools v2](docs/tools-v2.md).

