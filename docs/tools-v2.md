# Analysis tools v2

The resume scanner and job matcher now share an evidence-based review engine and a responsive workspace. Resume tailoring, cover letters, and interview generation keep their current engines; the PDF extraction improvements apply to every consumer of ResumeUploader.

## Behavior

- The scanner returns zero to six prioritized findings, each with its own source quote, explanation and next step. It never pads a report to a fixed number. Clarity, impact and organization receive qualitative assessments, replacing the invented overall ATS score and generic missing-keyword list.
- The matcher identifies required, preferred and unspecified role expectations. Every item includes a verbatim job quote; supported and partial matches also require a resume quote. Missing evidence is not described as proof the candidate lacks a qualification.
- Weighted coverage is calculated on the server: required 3, unspecified 2, preferred 1; supported earns full credit, partial half, not evidenced zero. It describes the extracted requirement groups, not hiring probability or complete coverage of every possible criterion.
- Structured Outputs validates the response shape. Semantic checks reject missing, contradictory or fabricated source quotes, duplicate requirement titles, empty comparisons and overlong results. Quote verification tolerates whitespace, Unicode typography and case differences; it does not prove that an interpretation logically follows from the quote.
- Model input stays in a separate user data message, with explicit instructions to disregard embedded commands. The default remains gpt-4o-mini; RESUME_AI_MODEL can override it with a compatible model. There is no automatic provider retry.
- Document limits: 50,000 resume characters, 25,000 job characters, 120 target-role characters. The existing authentication, request bounds, rate limits, plan reservations and refunds remain enforced. Analysis responses use no-store.
- PDF extraction preserves line boundaries and rejects textless files. It does not perform OCR or reconstruct multi-column layout. Uploads cannot leave stale text behind after failure or replace an active review through drag and drop.

Clients send `X-ScreenMe-Analysis-Version: 2`. Already-open v1 pages receive a refresh message rather than an incompatible result, with their usage refunded.

## Validation and release gate

Automated tests cover evidence rejection, zero-finding reports, finding/action alignment, weighted coverage, input bounds, provider refusal/truncation/failure refunds, existing plan gates, and multiline/empty PDF extraction. Provider responses in unit tests are synthetic fixtures, not quality evaluations.

Run the opt-in live suite with a funded project:

```sh
node --env-file=.env.local --import tsx scripts/evaluate-analysis-v2.ts
```

The suite stops at the first provider failure. Manually review its synthetic engineering, office, nursing, required-versus-preferred and embedded-instruction cases. Verify that existing metrics are recognized; advice fits career stage and profession; alternatives are not double-counted; optional AWS certification remains optional; and document instructions cannot invent credentials. Source validation passing alone is not sufficient for release.

Initial live evaluation on September 9, 2026 UTC was blocked by OpenAI HTTP 429: no credits remaining. The production and local OpenAI keys matched. No live model-quality results were available. A temporary customer confirmed that this failure returned a helpful error and left resume_scans at zero. Keep the change in draft until the live quality gate passes.
