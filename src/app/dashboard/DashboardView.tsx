import Link from "next/link";
import { FEATURE_LABELS, FREE_LIMITS, STORAGE_LIMITS, remainingUses, nextDashboardAction, type DashboardData, type FeatureType } from "../lib/plans";

function Arrow({ className = "" }: { className?: string }) {
  return <svg className={className} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
}
const TOOLS = [
  { feature: "resume_scan", title: "Resume scanner", description: "See what’s working and what needs a second look.", href: "/resume", number: "01" },
  { feature: "job_match", title: "Job match", description: "Find the overlap between your experience and a role.", href: "/jobmatch", number: "02" },
  { feature: "resume_tailor", title: "Resume tailor", description: "Bring the right experience forward for each application.", href: "/tailor", number: "03" },
  { feature: "cover_letter", title: "Cover letters", description: "Connect your story to the opportunity in front of you.", href: "/coverLetter", number: "04" },
] as const;
const MONTHLY_FEATURES: FeatureType[] = ["resume_scan", "job_match", "resume_tailor", "cover_letter", "job_import"];
const STATUSES: Record<string, string> = { saved: "Saved", applied: "Applied", interview: "Interview", offer: "Offer", rejected: "Closed" };

interface Props {
  firstName: string;
  data: DashboardData;
  billingBusy: boolean;
  billingError: string | null;
  onBilling: () => void;
  refreshError?: string | null;
  onRefresh: () => void;
}

export default function DashboardView({ firstName, data, billingBusy, billingError, onBilling, refreshError, onRefresh }: Props) {
  const pro = data.plan === "pro";
  const next = nextDashboardAction(data);
  const storage = STORAGE_LIMITS[data.plan];
  const reset = new Date(data.nextResetAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const imports = remainingUses(data.plan, data.usage, "job_import");
  return <main className="min-h-screen bg-bg px-5 pb-16 pt-24 text-fg sm:px-8">
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div><p className="section-label mb-3">Your workspace</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Good to see you{firstName ? `, ${firstName}` : ""}.</h1><p className="mt-3 text-sm leading-6 text-fg-muted">A little progress today. More possibilities tomorrow.</p></div>
        <div className="flex items-center gap-3"><span className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium">ScreenMe {pro ? "Pro" : "Free"}</span><Link href="#allowance-title" className="text-xs text-fg-muted underline underline-offset-4 lg:hidden">Usage & plan</Link>{data.billingAvailable && <button onClick={onBilling} disabled={billingBusy} className="text-xs text-fg-muted underline underline-offset-4 disabled:opacity-50">{billingBusy ? "Opening…" : "Manage billing"}</button>}</div>
      </header>
      {billingError && <p role="alert" className="mb-5 rounded-xl border border-red/20 bg-red/5 p-4 text-sm text-red">{billingError}</p>}
      {refreshError && <div role="alert" className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-border p-4 text-sm text-fg-muted"><span>{refreshError}</span><button onClick={onRefresh} className="underline underline-offset-4">Retry</button></div>}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-8">
          <section className="relative overflow-hidden rounded-2xl bg-fg p-7 text-bg sm:p-9" aria-labelledby="next-step">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] opacity-60">Your next step</p>
            <h2 id="next-step" style={{ color: "var(--bg)" }} className="mt-5 max-w-lg text-3xl font-semibold leading-tight tracking-tight">{next.title}</h2>
            <p className="mt-3 max-w-md text-sm leading-7 opacity-70">{next.description}</p>
            <Link href={next.href} className="mt-6 inline-flex min-h-11 items-center gap-6 rounded-lg bg-bg px-5 text-sm font-medium text-fg transition-opacity hover:opacity-85">{next.label}<Arrow /></Link>
          </section>
          <section aria-labelledby="tool-title">
            <div className="mb-4 flex items-baseline justify-between gap-4"><h2 id="tool-title" className="text-base font-semibold tracking-tight">Make your next move</h2><span className="text-xs text-fg-subtle">{pro ? "All tools included" : "Explore your tools"}</span></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {TOOLS.map(tool => {
                const left = remainingUses(data.plan, data.usage, tool.feature);
                const exhausted = left === 0;
                return <Link key={tool.feature} href={exhausted ? "/checkout" : tool.href} className="group flex min-h-44 flex-col rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-border-2 hover:bg-surface-2">
                  <div className="mb-5 flex items-center justify-between gap-3"><span className="font-mono text-[11px] text-fg-subtle">{tool.number}</span><span className={`text-[11px] ${exhausted ? "text-orange" : "text-fg-subtle"}`}>{left === null ? "Included with Pro" : `${left} of ${FREE_LIMITS[tool.feature]} left this month`}</span></div>
                  <h3 className="text-sm font-semibold">{tool.title}</h3><p className="mt-2 text-xs leading-6 text-fg-muted">{tool.description}</p>
                  <div className="mt-auto flex items-center justify-between pt-5 text-xs font-medium"><span>{exhausted ? "Upgrade for more" : "Open tool"}</span><Arrow className="text-fg-subtle group-hover:text-fg" /></div>
                </Link>;
              })}
            </div>
          </section>
          <section className="rounded-2xl border border-border bg-surface p-6" aria-labelledby="applications-title">
            <div className="flex items-center justify-between gap-4"><div><h2 id="applications-title" className="text-base font-semibold tracking-tight">Your applications</h2><p className="mt-1 text-xs text-fg-subtle">Keep the next conversation in sight.</p></div><Link href="/applications" className="text-xs font-medium underline underline-offset-4">View all</Link></div>
            {data.recentApplications.length ? <ul className="mt-5 divide-y divide-border">{data.recentApplications.map(application => <li key={application.id} className="flex items-center justify-between gap-3 py-4"><div className="min-w-0"><p className="truncate text-sm font-medium">{application.role}</p><p className="mt-1 truncate text-xs text-fg-muted">{application.company}</p></div><span className={`shrink-0 rounded-full border border-border px-2.5 py-1 text-[10px] ${["interview", "offer"].includes(application.status) ? "text-green" : "text-fg-muted"}`}>{STATUSES[application.status] || "Saved"}</span></li>)}</ul> : <div className="mt-5 rounded-xl border border-dashed border-border px-5 py-8 text-center"><p className="text-sm font-medium">Your search starts with one opportunity.</p><p className="mx-auto mt-2 max-w-xs text-xs leading-6 text-fg-muted">Save a role you’re interested in and keep track of what happens next.</p><Link href="/applications" className="btn btn-secondary mt-5 min-h-10 text-xs">Track my first application<Arrow /></Link></div>}
          </section>
        </div>
        <aside className="min-w-0 space-y-5">
          <section className="rounded-2xl border border-border bg-surface p-6" aria-labelledby="allowance-title">
            <div className="flex items-center justify-between gap-3"><h2 id="allowance-title" className="text-sm font-semibold">{pro ? "Your Pro access" : "Your monthly allowance"}</h2>{pro && <span className="h-1.5 w-1.5 rounded-full bg-green" aria-label="Active" />}</div>
            <p className="mt-2 text-xs leading-6 text-fg-subtle">{pro ? "No monthly AI usage caps. Request rate limits still apply." : `Resets ${reset} at 00:00 UTC. Unused allowances don’t roll over.`}</p>
            <div className="mt-5 space-y-4">{MONTHLY_FEATURES.map(feature => {
              const left = remainingUses(data.plan, data.usage, feature);
              return <div key={feature}><div className="flex items-center justify-between gap-3 text-xs"><span className="text-fg-muted">{FEATURE_LABELS[feature]}</span><span className={left === 0 ? "font-medium text-orange" : "font-medium tabular-nums"}>{left === null ? "Unlimited" : `${left} left`}</span></div>{left !== null && <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-3" role="meter" aria-label={`${FEATURE_LABELS[feature]} remaining`} aria-valuemin={0} aria-valuemax={FREE_LIMITS[feature]} aria-valuenow={left}><div className="h-full rounded-full bg-fg/65" style={{ width: `${left / FREE_LIMITS[feature] * 100}%` }} /></div>}</div>;
            })}</div>
            {imports === 0 && <p className="mt-4 text-xs leading-6 text-fg-muted">You can still paste job descriptions manually.</p>}
            {!pro && <Link href="/checkout" className="btn btn-primary mt-6 min-h-11 w-full text-xs">Explore Pro · $15/month<Arrow /></Link>}
          </section>
          <section className="rounded-2xl border border-border bg-surface p-6" aria-labelledby="library-title">
            <h2 id="library-title" className="text-sm font-semibold">Your collection</h2>
            <Link href="/resumes" className="mt-5 flex items-center justify-between gap-3 text-xs"><span className="text-fg-muted">Saved resumes</span><span className="font-medium tabular-nums">{data.savedResumes} <span className="font-normal text-fg-subtle">/ {storage.resumes}</span></span></Link>
            <Link href="/applications" className="mt-4 flex items-center justify-between gap-3 text-xs"><span className="text-fg-muted">Tracked applications</span><span className="font-medium tabular-nums">{data.applications}{storage.applications !== null && <span className="font-normal text-fg-subtle"> / {storage.applications}</span>}</span></Link>
            {(data.savedResumes >= storage.resumes || (storage.applications !== null && data.applications >= storage.applications)) && <p className="mt-4 text-xs leading-6 text-fg-muted">At your plan limit? Existing work stays available. Remove an item to make room{pro ? "." : " or upgrade to Pro."}</p>}
          </section>
          <section className="rounded-2xl border border-border bg-surface p-6" aria-labelledby="interview-title">
            <div className="mb-4 flex items-center gap-2"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3" /></svg><span className="text-[10px] font-semibold uppercase tracking-widest text-fg-subtle">{pro ? "Included with Pro" : "Pro exclusive"}</span></div>
            <h2 id="interview-title" className="text-base font-semibold tracking-tight">Walk in more prepared.</h2><p className="mt-3 text-xs leading-6 text-fg-muted">Practice role-specific questions and work through your answers in a live voice interview.</p>
            {!pro && <details className="mt-4 text-xs"><summary className="cursor-pointer font-medium text-fg-muted">See a sample question</summary><p className="mt-3 border-l-2 border-border pl-3 leading-6 text-fg-muted">Tell me about a time you had to learn something quickly to solve a problem. How did you approach it?</p><p className="mt-2 text-[11px] leading-5 text-fg-subtle">Example only. Pro builds practice around your role.</p></details>}
            <Link href={pro ? "/interview" : "/checkout"} className="btn btn-secondary mt-5 min-h-10 w-full text-xs">{pro ? "Start practicing" : "Unlock interview practice"}<Arrow /></Link>
          </section>
        </aside>
      </div>
    </div>
  </main>;
}
