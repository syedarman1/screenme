import type { ReactNode } from "react";
import Link from "next/link";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";

function Arrow({ className = "" }: { className?: string }) {
  return <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
}

export function SuccessShell({ children }: { children: ReactNode }) {
  return <div className="flex min-h-svh flex-col bg-bg text-fg">
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 sm:px-10">
      <Link href="/dashboard" aria-label="ScreenMe home"><Logo /></Link>
      <ThemeToggle />
    </header>
    <main className="flex flex-1 items-center px-6 py-10 sm:px-10 sm:py-16">{children}</main>
    <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-6 text-xs text-fg-subtle sm:px-10">
      <span>ScreenMe · Built for your next chapter.</span>
      <Link href="/contact" className="transition-colors hover:text-fg">Need a hand?</Link>
    </footer>
  </div>;
}

export function VerificationPending() {
  return <SuccessShell><section role="status" className="mx-auto w-full max-w-xl py-16 text-center">
    <span className="mx-auto mb-6 block h-6 w-6 animate-spin rounded-full border-2 border-border border-t-fg motion-reduce:animate-none" aria-hidden />
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-subtle">One moment</p>
    <h1 className="mt-4 text-3xl font-semibold tracking-tight">Getting Pro ready for you.</h1>
    <p className="mt-4 text-sm leading-7 text-fg-muted">We’re confirming your payment and activating your access.</p>
  </section></SuccessShell>;
}

export function ProConfirmation() {
  return <SuccessShell>
    <section className="mx-auto grid w-full max-w-5xl items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20" aria-labelledby="pro-title">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-green/20 bg-green/5 px-3 py-1.5 text-[11px] font-medium text-fg-muted">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green" aria-hidden><path d="m5 12 4 4L19 6" /></svg>
          Payment confirmed
        </div>
        <h1 id="pro-title" className="mt-7 text-[2.5rem] font-semibold leading-[1.08] tracking-[-0.045em] sm:text-5xl lg:text-[3.5rem]">You’re ready for<br className="hidden sm:block" /> what’s next.</h1>
        <p className="mt-6 max-w-sm text-base leading-7 text-fg-muted">Your Pro access is active. Bring your next opportunity into focus, one application at a time.</p>
        <Link href="/dashboard" className="btn btn-primary mt-8 min-h-12 gap-6 px-6">Go to my dashboard <Arrow /></Link>
        <p className="mt-4 text-xs leading-6 text-fg-subtle">Manage your subscription anytime from your dashboard.</p>
      </div>
      <div className="overflow-hidden rounded-3xl border border-border bg-surface">
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-5 sm:px-8">
          <span className="text-sm font-semibold tracking-tight">ScreenMe Pro</span>
          <span className="flex items-center gap-2 text-xs text-fg-muted"><span className="h-1.5 w-1.5 rounded-full bg-green" />Active</span>
        </div>
        <div className="p-6 sm:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">A good place to start</p>
          <Link href="/tailor" className="group mt-6 flex items-start gap-4 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-fg">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-bg" aria-hidden><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5" /></svg></span>
            <span className="flex-1"><span className="block text-sm font-medium">Tailor your next application</span><span className="mt-1.5 block text-xs leading-6 text-fg-muted">Shape your resume around the role you want.</span></span>
            <Arrow className="mt-1 shrink-0 text-fg-subtle transition-colors group-hover:text-fg" />
          </Link>
          <Link href="/interview" className="group mt-6 flex items-start gap-4 rounded-xl border-t border-border pt-6 focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-fg">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-bg" aria-hidden><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" /></svg></span>
            <span className="flex-1"><span className="block text-sm font-medium">Find your interview rhythm</span><span className="mt-1.5 block text-xs leading-6 text-fg-muted">Practice your answers with a live voice interview.</span></span>
            <Arrow className="mt-1 shrink-0 text-fg-subtle transition-colors group-hover:text-fg" />
          </Link>
        </div>
        <div className="border-t border-border bg-bg/50 px-6 py-4 text-xs leading-6 text-fg-subtle sm:px-8">Your resume, writing, and interview tools are ready in your dashboard.</div>
      </div>
    </section>
  </SuccessShell>;
}
