# Connected workflow enhancement audits

## Stage 1 — saved work, editable improvements, writing tools

Completed locally, 9 September 2026. Baseline: ac28894. No production data or schema changes.

Built account-owned saved work across five tools, automatic draft recovery, revision conflicts, ten completed-report snapshots, original/proposed passage editing, and redesigned tailoring, letters and interview preparation. Free accounts retain three workspaces; Pro accounts retain twenty. Writing drafts undergo a separate factual check; numerical additions are rejected unless present in source facts. Failed generations refund their allowance.

Audit fixes: synchronized save state before navigation; protected late responses across account/workspace switches; blocked accepting edits when the original cannot save; kept completed-report history separate from keystrokes; reset factual confirmation between drafts; restored DOCX and clipboard export; upgraded audio input bounds and untrusted-context handling.

Validation: 71 automated tests passed, none skipped, against disposable PostgreSQL; lint, typecheck and production build passed. Database tests cover concurrent limits, owner-only access, blocked client writes, revision increments and cascading history deletion. Four funded real-model writing cases passed: engineer tailoring, cover letter, nursing interview outlines and a source-bound passage edit. Browser QA verified draft recovery, real resume review, report recovery, accepted edit, stale-report notice and restoration of the original report/source. Narrow-screen layout visually inspected.

Limits: AI factual verification is probabilistic; users must review drafts. This audit does not establish production email deliverability or payment settlement. DOCX uses clean paragraph formatting rather than preserving uploaded document layout. Broader cross-browser and assistive-technology testing remains useful after release.

## Stage 2 — accounts, connected applications, monitoring

Implemented and audited locally, 9 September 2026. Both stages remain on the enhancement branch; no production schema or deployment was changed.

Built branded confirmation/recovery templates, confirmation resend, clearer auth states, account and current Stripe subscription status, linked application workspaces with reusable resume/job context, source-preserving reports, server-only AI metrics, owner/operator activity views, and per-report helpfulness votes.

Audit fixes: preserved saved drafts and exports after quota exhaustion; disabled new AI generation when unavailable; protected page navigation during generation; cleared private views when the auth identity changes; fixed navigation on nested application/activity pages; added bounded application validation and stale-edit conflicts; prevented duplicate history snapshots when restoring; caught history/deletion network errors; removed raw provider errors from job-import logs; counted the separate writing verification call; marked unknown/audio/failed-call costs as incomplete. Updated the privacy notice to match actual storage and application deletion behavior.

Validation: 82 automated tests passed with no skips, including real PostgreSQL ownership, composite foreign keys, concurrent limits, atomic creation, lifecycle entitlement states, ten-snapshot retention, monitoring privacy, and feedback authorization. Local Supabase database lint found no schema errors. Lint and typecheck passed. The final production build passed, and the dependency audit reported zero known vulnerabilities.

Real integrations: local Supabase signup/confirmation/recovery passed through a local inbox; reused links and old passwords were rejected. Real Stripe test subscriptions passed activation, renewal, failed renewal, payment recovery, scheduled cancellation, reversal and final cancellation. Duplicate events created one receipt. Stripe events were forwarded and signed locally; this is not public delivery verification. Temporary billing resources and the temporary auth-flow account were removed.

Browser checks: application details and links loaded; a saved resume and job populated a new letter workspace; a real verified letter persisted; DOCX download was triggered; helpfulness feedback saved; account storage limits and activity metrics displayed. The two AI calls used 1,237 input and 318 output tokens in this run, with a conservative model cost estimate of $0.00629. Narrow and desktop layouts were inspected. Signing out removed account activity, and reopening the private page showed a sign-in gate. After setting the local account to its free letter limit, the saved letter remained editable while generation was disabled and exports remained available after confirmation.

Release dependencies at the stage-2 audit: Resend sign-in/domain verification and Supabase SMTP configuration, genuine public Stripe webhook delivery verification in the intended environment, target database migrations/advisors, operator identity configuration, and deployment smoke checks. The configured Stripe test account had no webhook destinations at inspection. None of these live configuration steps is claimed complete. See `connected-workflow-release.md` for exact activation steps and test limitations.

The local browser QA account and its saved documents, application, and monitoring records were removed after verification.

## Live email activation — 9 September 2026

The owner connected Resend and authorized setup and a first email. Verified screenme.dev through Vercel DNS, enabled encrypted delivery, installed the branded confirmation/recovery templates, and configured production Supabase SMTP with a sending-only key restricted to screenme.dev. The temporary onboarding key was revoked. No paid service was purchased.

Resend recorded successful delivery of the first email, a branded sender test, signup confirmation and password recovery. The two auth messages used a temporary plus-address account at the owner's Gmail inbox. Delivered confirmation and recovery links issued the expected sessions and canonical redirects. Password replacement succeeded; old-password login and link reuse were rejected, while new-password login passed. Test sessions, the test account and temporary credential files were removed. This verifies API-level auth and provider delivery, not Gmail folder placement or a complete browser password-change flow.

Enabled the production email-delivery flag and rebuilt the existing production deployment. Deployment `dpl_13AdhuRo67AaMfvM1Eo1MTe6Qbkn` is Ready, serves the canonical domain, and the live browser shows enabled email signup and password recovery controls. PR #33 and its database migrations remain undeployed; public Stripe webhook delivery is still outstanding.
