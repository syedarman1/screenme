"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { loadStripe, type StripeExpressCheckoutElementConfirmEvent } from "@stripe/stripe-js";
import { CheckoutElementsProvider, ExpressCheckoutElement, PaymentElement, useCheckoutElements } from "@stripe/react-stripe-js/checkout";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";
import { useTheme } from "../components/ThemeProvider";
import { supabase } from "../lib/supabaseClient";
import { authFetch } from "../lib/authFetch";

type Configuration = { clientSecret: string; publishableKey: string };
const FEATURES = [
  ["Make every application count", "Scan, match, and tailor your resume to the role."],
  ["Find the words that sound like you", "Create cover letters with every tone available."],
  ["Walk into interviews prepared", "Practice with job-specific questions and voice interviews."],
  ["Keep your search in one place", "Save 20 resume versions and track unlimited applications."],
];

function Lock() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>;
}

function Loading() {
  return <div role="status" className="py-14 text-center text-sm text-fg-muted"><span className="mx-auto mb-4 block h-5 w-5 rounded-full border-2 border-border border-t-fg animate-spin" />Preparing your secure checkout…</div>;
}

function CheckoutForm() {
  const state = useCheckoutElements();
  const [busy, setBusy] = useState(false);
  const confirming = useRef(false);
  const [ready, setReady] = useState(false);
  const [expressAvailable, setExpressAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  useEffect(() => {
    if (state.type !== "loading") return;
    const timer = window.setTimeout(() => setLoadTimedOut(true), 30_000);
    return () => window.clearTimeout(timer);
  }, [state.type]);

  if (state.type === "loading") return loadTimedOut ? <CheckoutError message="The payment service took too long to respond. Please reload and try again." /> : <Loading />;
  if (state.type === "error") return <CheckoutError message="We couldn't load the payment form. Please reload and try again." />;
  const { checkout } = state;

  const confirm = async (expressCheckoutConfirmEvent?: StripeExpressCheckoutElementConfirmEvent) => {
    if (confirming.current) return;
    confirming.current = true; setBusy(true); setError(null);
    try {
      const result = await checkout.confirm({ expressCheckoutConfirmEvent, redirect: "if_required" });
      if (result.type === "error") setError(result.error.message || "Your payment couldn't be completed. Please try another payment method.");
      else window.location.assign(`/success?session_id=${encodeURIComponent(result.session.id)}`);
    } catch {
      setError("We couldn't confirm your payment. Please retry; your existing checkout will be reused.");
    } finally { confirming.current = false; setBusy(false); }
  };

  return <>
    {!checkout.livemode && <p className="mb-5 rounded-lg border border-orange/25 bg-orange/5 px-3 py-2 text-xs font-medium text-orange">Test checkout · No real money will be charged</p>}
    <div className="mb-6 rounded-xl border border-border bg-bg px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">Your account</p>
      <p className="mt-1 break-all text-sm text-fg">{checkout.email}</p>
    </div>
    <div className={expressAvailable ? "mb-6" : ""}>
      {expressAvailable && <p className="mb-3 text-xs font-medium text-fg-muted">Express checkout</p>}
      <ExpressCheckoutElement
        options={{ buttonHeight: 48, buttonTheme: {}, buttonType: {}, paymentMethodOrder: undefined, paymentMethods: undefined, layout: { maxColumns: 2, maxRows: 2, overflow: "auto" } }}
        onReady={({ availablePaymentMethods }) => setExpressAvailable(Boolean(availablePaymentMethods && Object.values(availablePaymentMethods).some(Boolean)))}
        onLoadError={() => setExpressAvailable(false)}
        onConfirm={event => { void confirm(event); }}
      />
    </div>
    {expressAvailable && <div className="mb-6 flex items-center gap-3 text-[11px] text-fg-subtle"><span className="h-px flex-1 bg-border" />or choose a payment method<span className="h-px flex-1 bg-border" /></div>}
    <form onSubmit={event => { event.preventDefault(); void confirm(); }}>
      <PaymentElement options={{ wallets: { link: "never" }, layout: { type: "accordion", defaultCollapsed: false, radios: "never", spacedAccordionItems: true } }} onReady={() => setReady(true)} onLoadError={() => setError("The payment form couldn't load. Check your connection and reload this page.")} />
      {error && <p role="alert" className="mt-4 rounded-lg border border-red/20 bg-red/5 px-4 py-3 text-sm text-red">{error}</p>}
      <div className="mt-7 space-y-3 border-t border-border pt-5 text-sm">
        <div className="flex justify-between gap-4 text-fg-muted"><span>ScreenMe Pro · monthly</span><span className="tabular-nums">{checkout.total.subtotal.amount}</span></div>
        {checkout.total.discount.minorUnitsAmount > 0 && <div className="flex justify-between gap-4 text-green"><span>Discount</span><span>−{checkout.total.discount.amount}</span></div>}
        {checkout.total.taxExclusive.minorUnitsAmount > 0 && <div className="flex justify-between gap-4 text-fg-muted"><span>Tax</span><span>{checkout.total.taxExclusive.amount}</span></div>}
        <div className="flex justify-between gap-4 text-base font-semibold text-fg"><span>Due today</span><span className="tabular-nums">{checkout.total.total.amount}</span></div>
      </div>
      <button type="submit" disabled={busy || !ready || !checkout.canConfirm} className="btn btn-primary mt-6 min-h-12 w-full gap-2 disabled:cursor-not-allowed disabled:opacity-50">
        <Lock />{busy ? "Confirming payment…" : `Subscribe · ${checkout.total.total.amount}/month`}
      </button>
      <p className="mt-4 text-center text-xs leading-relaxed text-fg-subtle">Renews monthly until you cancel. Cancel anytime in billing settings to stop your next renewal. By subscribing, you agree to our <Link href="/terms" className="underline underline-offset-2">Terms</Link> and <Link href="/privacy" className="underline underline-offset-2">Privacy Notice</Link>.</p>
    </form>
    <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-fg-subtle"><Lock />Payments secured by Stripe</div>
  </>;
}

function CheckoutError({ message }: { message: string }) {
  return <div className="py-8 text-center"><p role="alert" className="text-sm leading-relaxed text-red">{message}</p><button className="btn btn-secondary mt-5" onClick={() => window.location.reload()}>Try again</button><p className="mt-4 text-xs text-fg-muted"><Link href="/contact" className="underline">Contact support</Link></p></div>;
}

function PaymentPanel({ configuration }: { configuration: Configuration }) {
  const { theme } = useTheme();
  const stripe = useMemo(() => loadStripe(configuration.publishableKey), [configuration.publishableKey]);
  const options = useMemo(() => ({ clientSecret: configuration.clientSecret, elementsOptions: { appearance: {
    theme: theme === "dark" ? "night" as const : "stripe" as const,
    variables: { colorPrimary: theme === "dark" ? "#ededed" : "#2f2f2f", colorBackground: theme === "dark" ? "#141414" : "#ffffff", colorText: theme === "dark" ? "#ededed" : "#171717", colorDanger: theme === "dark" ? "#e07068" : "#c44b42", fontFamily: "Arial, sans-serif", borderRadius: "10px", spacingUnit: "4px" },
    rules: { ".Input": { boxShadow: "none", border: theme === "dark" ? "1px solid #333333" : "1px solid #e5e5e5" }, ".Label": { fontSize: "13px", fontWeight: "500" } },
  } } }), [configuration.clientSecret, theme]);
  return <CheckoutElementsProvider stripe={stripe} options={options}><CheckoutForm /></CheckoutElementsProvider>;
}

export default function CheckoutPage() {
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 30_000);
    (async () => {
      try {
        if (!supabase) throw new Error("Account service is unavailable. Please try again later.");
        const { data, error: authError } = await supabase.auth.getUser();
        if (!active) return;
        if (!data.user) { if (authError && authError.name !== "AuthSessionMissingError") throw new Error("We couldn't check your account. Please retry."); setSignedOut(true); return; }
        const response = await authFetch("/api/stripe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "checkout" }), signal: controller.signal });
        const result = await response.json();
        if (!active) return;
        if (!response.ok) throw new Error(result.error || "Checkout is temporarily unavailable.");
        if (result.url) { window.location.assign(result.url); return; }
        if (!result.clientSecret || !result.publishableKey) throw new Error("Checkout is temporarily unavailable.");
        setConfiguration(result);
      } catch (caught) { if (active) setError(caught instanceof Error && caught.name !== "AbortError" ? caught.message : "Checkout took too long to load. Please retry."); }
      finally { window.clearTimeout(timer); if (active) setLoading(false); }
    })();
    return () => { active = false; window.clearTimeout(timer); controller.abort(); };
  }, []);

  const signIn = () => {
    try { sessionStorage.setItem("screenme-after-auth", "/checkout"); } catch { /* The upgrade button remains available after sign-in. */ }
    window.location.assign("/login");
  };

  return <main className="min-h-screen bg-bg text-fg">
    <header className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6 md:px-10">
      <Link href="/dashboard" aria-label="ScreenMe home"><Logo className="text-lg" /></Link>
      <div className="flex items-center gap-4"><span className="hidden items-center gap-2 text-xs text-fg-subtle sm:flex"><Lock />Secure checkout</span><ThemeToggle /></div>
    </header>
    <div className="mx-auto max-w-5xl px-6 pb-12 pt-5 md:px-10 md:pt-12">
      <Link href="/dashboard" className="mb-9 inline-flex items-center gap-2 text-xs text-fg-muted hover:text-fg"><span aria-hidden>←</span> Back to dashboard</Link>
      <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.12fr] lg:gap-16">
        <section className="lg:sticky lg:top-10">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-medium tracking-wide"><span className="h-1.5 w-1.5 rounded-full bg-green" />SCREENME PRO</div>
          <h1 className="max-w-sm text-3xl font-semibold leading-[1.12] tracking-[-0.035em] md:text-5xl">Your next move,<br /><span className="text-fg-muted">with more confidence.</span></h1>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-fg-muted">A stronger resume. A more personal application. A little more ready for what comes next.</p>
          <div className="my-6 flex items-baseline gap-2 lg:my-8"><span className="text-5xl font-semibold tracking-tight">$15</span><span className="text-sm text-fg-muted">USD / month</span></div>
          <details className="rounded-lg border border-border p-4 lg:hidden"><summary className="cursor-pointer text-sm font-medium">Everything included in Pro</summary><ul className="mt-4 space-y-3 text-xs leading-relaxed text-fg-muted">{FEATURES.map(([title, description]) => <li key={title}>{description}</li>)}</ul></details>
          <div className="hidden space-y-5 border-t border-border pt-7 lg:block">
            {FEATURES.map(([title, description]) => <div key={title} className="flex gap-3"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green/10 text-green" aria-hidden><svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="m3 8 3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span><div><h2 className="text-sm font-medium">{title}</h2><p className="mt-1 text-xs leading-relaxed text-fg-muted">{description}</p></div></div>)}
          </div>
          <p className="mt-5 text-xs leading-relaxed text-fg-subtle lg:mt-7">No monthly AI usage caps. Request rate limits apply.<br />Cancel your next renewal anytime.</p>
        </section>
        <section aria-labelledby="checkout-title" className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
          <h2 id="checkout-title" className="text-xl font-semibold tracking-tight">Make it Pro.</h2>
          <p className="mb-7 mt-1.5 text-sm text-fg-muted">One plan. Every career tool.</p>
          {loading ? <Loading /> : error ? <CheckoutError message={error} /> : signedOut ? <div className="py-8 text-center"><p className="text-sm leading-relaxed text-fg-muted">Sign in to connect Pro to your ScreenMe account.</p><button onClick={signIn} className="btn btn-primary mt-5 w-full">Sign in to continue</button><p className="mt-3 text-xs text-fg-subtle">You&apos;ll return here to complete your purchase.</p></div> : configuration ? <PaymentPanel configuration={configuration} /> : null}
        </section>
      </div>
      <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-xs text-fg-subtle"><span>ScreenMe · Built for your next chapter.</span><div className="flex gap-5"><Link href="/contact" className="hover:text-fg">Need a hand?</Link><Link href="/terms" className="hover:text-fg">Terms</Link><Link href="/privacy" className="hover:text-fg">Privacy</Link></div></footer>
    </div>
  </main>;
}
