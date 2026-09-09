// src/app/success/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ProConfirmation, SuccessShell, VerificationPending } from "./ProConfirmation";
import { supabase } from "../lib/supabaseClient";
import { authFetch } from "../lib/authFetch";

type SuccessState =
  | "loading"
  | "success"
  | "error"
  | "already_processed"
  | "unauthorized";

interface PaymentVerification {
  success: boolean;
  message: string;
  planUpdated?: boolean;
  alreadyProcessed?: boolean;
}

function SuccessPageContent() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<SuccessState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const handleSuccess = async () => {
      if (!supabase) {
        setErrorMessage("Authentication service not available");
        setState("error");
        return;
      }
      
      try {
        const {
          data: { user: currentUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !currentUser) {
          console.error("Authentication error:", authError);
          setState("unauthorized");
          return;
        }

        const sessionId = searchParams.get("session_id");

        if (!sessionId) {
          console.error("No session_id found in URL");
          setErrorMessage("Missing payment session information.");
          setState("error");
          return;
        }

        // Verify the payment with our backend
        const verificationResult = await verifyPayment(
          sessionId
        );

        if (verificationResult.success) {
          if (verificationResult.alreadyProcessed) {
            setState("already_processed");
          } else {
            setState("success");
          }
        } else {
          setErrorMessage(verificationResult.message);
          setState("error");
        }
      } catch (error) {
        console.error("Error in handleSuccess:", error);
        setErrorMessage(
          "An unexpected error occurred while processing your payment."
        );
        setState("error");
      }
    };

    handleSuccess();
  }, [searchParams, retryCount]);

  const verifyPayment = async (
    sessionId: string
  ): Promise<PaymentVerification> => {
    try {
      const response = await authFetch("/api/stripe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "verify",
          sessionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error verifying payment:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to verify payment",
      };
    }
  };

  const handleRetry = () => {
    setState("loading");
    setRetryCount((prev) => prev + 1);
  };

  if (state === "loading") return <VerificationPending />;
  if (state === "success" || state === "already_processed") return <ProConfirmation />;

  const unauthorized = state === "unauthorized";
  return <SuccessShell>
    <section className="mx-auto w-full max-w-xl rounded-3xl border border-border bg-surface p-7 sm:p-12" aria-live="polite">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-subtle">{unauthorized ? "Your account" : "Payment confirmation"}</p>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight">{unauthorized ? "Sign in to view your upgrade." : "We couldn’t confirm your upgrade."}</h1>
      <p className="mt-4 text-sm leading-7 text-fg-muted">{unauthorized ? "Use the account you chose at checkout to check your Pro access." : errorMessage || "Please try checking again or contact support for help."}</p>
      {!unauthorized && <p className="mt-3 text-sm leading-7 text-fg-muted">Checking again won’t create another payment.</p>}
      <div className="mt-8 flex flex-wrap items-center gap-4">
        {unauthorized ? <Link href="/login" className="btn btn-primary min-h-12 px-6">Sign in</Link> : <button onClick={handleRetry} className="btn btn-primary min-h-12 px-6">Check again</button>}
        <Link href="/contact" className="text-sm text-fg-muted underline underline-offset-4">Contact support</Link>
      </div>
    </section>
  </SuccessShell>;
}

export default function SuccessPage() {
  return <Suspense fallback={<VerificationPending />}><SuccessPageContent /></Suspense>;
}
