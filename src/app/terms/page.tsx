import Link from "next/link";
import Footer from "../components/Footer";

export const metadata = { title: 'Terms of use | ScreenMe' };

export default function PolicyPage() {
  return <><main className="page-shell"><article className="max-w-3xl mx-auto px-6 py-16">
    <p className="section-label mb-3">ScreenMe</p>
    <h1 className="text-3xl font-semibold mb-3">Terms of use</h1>
    <p className="text-sm text-fg-muted mb-10">Updated September 8, 2026</p>
    <section className="mb-8"><h2 className="text-xl font-semibold mb-3">Using ScreenMe</h2><p className="text-fg-muted leading-relaxed">ScreenMe provides resume feedback, document drafting, job matching, interview practice, and tools to organize your job search. Keep your account credentials private and submit only content you are authorized to use. Do not attempt to bypass usage limits, access another person’s account, or disrupt the service.</p></section>
    <section className="mb-8"><h2 className="text-xl font-semibold mb-3">Review AI output</h2><p className="text-fg-muted leading-relaxed">AI responses and scores can be inaccurate or incomplete. Review every document and suggestion before using it, and keep claims about your experience truthful. ScreenMe scores are guidance; they do not reproduce an employer’s applicant tracking system. Using the service does not guarantee a job, interview, or hiring outcome.</p></section>
    <section className="mb-8"><h2 className="text-xl font-semibold mb-3">Free and Pro plans</h2><p className="text-fg-muted leading-relaxed">The Free plan includes three resume scans, two cover letters, two job matches, and two resume tailoring sessions per calendar month, resetting at the start of the month in UTC. Interview preparation requires Pro. The Free plan supports three saved resumes and ten tracked applications. Pro removes monthly tool allowances, supports up to twenty saved resumes, and allows unlimited tracked applications. Request rate limits still apply to protect availability.</p></section>
    <section className="mb-8"><h2 className="text-xl font-semibold mb-3">Billing and cancellation</h2><p className="text-fg-muted leading-relaxed">Pro costs US$15 per month and renews monthly through Stripe. Review the total and terms shown at checkout before subscribing. Use Manage billing on your dashboard to view invoices, update your payment method, or cancel renewal. Cancellation takes effect at the end of the current billing period. For a billing problem or refund request, contact support with your account email; do not send full card details.</p></section>
    <section className="mb-8"><h2 className="text-xl font-semibold mb-3">Your content and support</h2><p className="text-fg-muted leading-relaxed">You retain your rights in the content you submit. ScreenMe processes that content to provide the features you request, as described in the privacy notice. For account, service, or billing questions, use the contact form. These terms do not limit rights that applicable law gives you.</p></section>
    <p className="text-sm text-fg-muted">Questions? <Link href="/contact" className="underline">Contact ScreenMe</Link>. Read our <Link href="/privacy" className="underline">privacy notice</Link>.</p>
  </article></main><Footer /></>;
}
