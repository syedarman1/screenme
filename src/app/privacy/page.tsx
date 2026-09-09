import Link from "next/link";
import Footer from "../components/Footer";

export const metadata = { title: "Privacy notice | ScreenMe" };

export default function PolicyPage() {
  return (
    <>
      <main className="page-shell">
        <article className="max-w-3xl mx-auto px-6 py-16">
          <p className="section-label mb-3">ScreenMe</p>
          <h1 className="text-3xl font-semibold mb-3">Privacy notice</h1>
          <p className="text-sm text-fg-muted mb-10">
            Updated September 9, 2026
          </p>
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">
              Information you provide
            </h2>
            <p className="text-fg-muted leading-relaxed">
              ScreenMe processes your account email and sign-in details, resume
              text, job descriptions, and the instructions you submit to its
              tools. Saved resume versions, application entries, tool drafts,
              source documents, completed reports, and practice notes are stored
              in your account. Tool workspaces save automatically and keep up to
              ten completed-report snapshots. Contact submissions store your
              name, email, topic, and message in a private support inbox.
            </p>
          </section>
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">
              AI and voice features
            </h2>
            <p className="text-fg-muted leading-relaxed">
              When you run an AI tool, the relevant resume text, job
              description, or conversation is sent to OpenAI to generate a
              response. Voice interview recordings are sent for transcription,
              and the transcript is used in the interview conversation. Spoken
              replies use your browser’s speech service. Avoid including
              sensitive information that is unnecessary for your request.
            </p>
          </section>
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">Service providers</h2>
            <p className="text-fg-muted leading-relaxed">
              ScreenMe uses Supabase for authentication and database storage,
              OpenAI for AI processing, Vercel for hosting, and Stripe for
              payments and billing management. Each provider receives the
              information needed to provide its service. Stripe handles payment
              card entry; ScreenMe stores customer and subscription identifiers
              and billing status.
            </p>
          </section>
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">
              Browser storage and operational records
            </h2>
            <p className="text-fg-muted leading-relaxed">
              Your browser stores sign-in sessions, theme preferences, and a
              selected plan when you begin an upgrade. Shared devices may retain
              this information until it is cleared. The service also records
              usage counts, billing fulfillment records, and diagnostic
              information. AI monitoring records your account identifier, tool,
              model, response status, duration, token counts, estimated model
              cost, and helpfulness votes. These monitoring records do not
              contain document text, prompts, or generated responses. Hashed
              identifiers are used to enforce request limits.
            </p>
          </section>
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">
              Managing your information
            </h2>
            <p className="text-fg-muted leading-relaxed">
              You can delete saved resumes, tool workspaces and their history,
              and application entries through their respective tools. Deleting
              an application removes its links to tool workspaces; delete those
              workspaces separately if you also want to remove their documents
              and reports. To request account deletion, ask about stored
              information, or raise a privacy concern, use the contact form and
              identify the email address associated with your account. Identity
              verification may be needed before an account request can be
              handled. Provider retention practices and billing record
              requirements may affect what can be removed.
            </p>
          </section>
          <p className="text-sm text-fg-muted">
            Questions?{" "}
            <Link href="/contact" className="underline">
              Contact ScreenMe
            </Link>
            . Read our{" "}
            <Link href="/terms" className="underline">
              terms of use
            </Link>
            .
          </p>
        </article>
      </main>
      <Footer />
    </>
  );
}
