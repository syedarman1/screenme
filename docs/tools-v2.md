# Analysis tools v2

The resume scanner and job matcher now share an evidence-based review engine and a responsive workspace. Resume tailoring, cover letters, and interview generation keep their current engines; the PDF extraction improvements apply to every consumer of ResumeUploader.

## Behavior

- The scanner returns zero to six prioritized findings, each with its own source quote, explanation and next step. It never pads a report to a fixed number. Clarity, impact and organization receive qualitative assessments, replacing the invented overall ATS score and generic missing-keyword list.
- The matcher identifies required, preferred and unspecified role expectations. Every item includes a verbatim job quote; supported and partial matches also require a resume quote. Missing evidence is not described as proof the candidate lacks a qualification.
- Weighted coverage is calculated on the server: required 3, unspecified 2, preferred 1; supported earns full credit, partial half, not evidenced zero. It describes the extracted requirement groups, not hiring probability or complete coverage of every possible criterion.
- Structured Outputs validates the response shape. The model selects source passage IDs from a schema restricted to the supplied documents, and the server inserts the original text. Validators reject unknown/cross-document references, contradictory evidence status, duplicate requirement titles, empty comparisons and overlong results. A narrow contradiction check rejects claims that explicit existing section headings are missing. Explicitly optional findings are low priority. These checks do not prove that an interpretation logically follows from its evidence.
- Model input stays in a separate user data message, with explicit instructions to disregard embedded commands. The default is gpt-5.6-terra with low reasoning effort after live evaluation found unreliable chronology and context judgments in the older models. The current UTC date is included for chronology. RESUME_AI_MODEL can override the default with a compatible model; GPT-5/6 models receive reasoning_effort=low and max_completion_tokens, while older compatible models receive temperature and max_tokens. There is no automatic provider retry. The 6,000-token output ceiling includes reasoning, and the provider timeout is 45 seconds. Model changes must rerun the live quality suite.
- Usable input is an explicit boolean, so an empty optional error description cannot invalidate a valid resume. Empty optional next steps normalize to null only for supported requirements; partial and missing evidence still require an action.
- Document limits: 50,000 resume characters, 25,000 job characters, 120 target-role characters. The existing authentication, request bounds, rate limits, plan reservations and refunds remain enforced. Analysis responses use no-store.
- PDF extraction preserves line boundaries and rejects textless files. It does not perform OCR or reconstruct multi-column layout. Uploads cannot leave stale text behind after failure or replace an active review through drag and drop.

Clients send `X-ScreenMe-Analysis-Version: 2`. Already-open v1 pages receive a refresh message rather than an incompatible result, with their usage refunded.

## Validation and release gate

Automated tests cover evidence rejection, zero-finding reports, finding/action alignment, weighted coverage, input bounds, provider refusal/truncation/failure refunds, existing plan gates, and multiline/empty PDF extraction. Provider responses in unit tests are synthetic fixtures, not quality evaluations.

Run the opt-in live suite with a funded project:

```sh
node --env-file=.env.local --import tsx scripts/evaluate-analysis-v2.ts
```

The suite stops at the first failed assertion or provider failure. Manually review its synthetic engineering, office, nursing, required-versus-preferred and embedded-instruction cases. Verify that existing metrics are recognized; advice fits career stage and profession; alternatives are not double-counted; optional AWS certification remains optional; and document instructions cannot invent credentials. Source validation passing alone is not sufficient for release.

On September 9, 2026 UTC, the funded live suite passed all eight cases: strong engineering resume, vague office resume, nursing resume, required versus preferred qualifications, embedded document instructions, unproven skill duration, nursing qualifications, and unrelated input rejection. The temporary signed-in customer also confirmed that rejected input returns HTTP 400 and leaves the resume-scan allowance unchanged. Live outputs were manually reviewed; this small synthetic suite is a release gate, not a guarantee of correctness across every resume.
