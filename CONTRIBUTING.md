# Contributing to ScreenMe

Thanks for taking the time to improve ScreenMe. Open a focused issue before proposing a substantial feature so the scope can be agreed first. For customer account or payment help, use [product support](https://www.screenme.dev/contact).

## Development

Follow [the setup guide](docs/development.md), use the pinned Node version and install with `npm ci`. Use synthetic resumes, a development database and Stripe test mode. Keep credentials and customer documents out of code, logs, screenshots and issues.

## Pull requests

Explain the customer problem, the resulting behavior and the checks you ran. Include before/after screenshots for visible changes using synthetic data. Add meaningful regression coverage for ownership, persistence, billing and quota changes. Avoid unrelated formatting or dependency updates.

Before requesting review, run lint, typecheck, all tests against disposable PostgreSQL, and a production build. Disclose skipped checks. Schema changes need an additive migration, ownership/grant review, and an explicit release/rollback plan.

AI output must preserve source facts. Never improve a resume by fabricating credentials, numbers or experience. Frontend plan gates complement server enforcement; they cannot replace it.

Contributions are subject to maintainer review. The repository currently has no general open-source license; discuss intended reuse with the maintainer.
