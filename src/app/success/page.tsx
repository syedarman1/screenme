// src/app/success/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import { supabase } from "../lib/supabaseClient";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<SuccessState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const handleSuccess = async () => {
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

        setUser(currentUser);

        const sessionId = searchParams.get("session_id");

        if (!sessionId) {
          console.error("No session_id found in URL");
          setErrorMessage("Missing payment session information.");
          setState("error");
          return;
        }

        // Verify the payment with our backend
        const verificationResult = await verifyPayment(
          sessionId,
          currentUser.id
        );

        if (verificationResult.success) {
          if (verificationResult.alreadyProcessed) {
            setState("already_processed");
          } else {
            // Fire confetti on successful new payment
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
            });
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
    sessionId: string,
    userId: string
  ): Promise<PaymentVerification> => {
    try {
      const response = await fetch("/api/stripe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "verify",
          sessionId,
          userId,
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

  const renderContent = () => {
    switch (state) {
      case "loading":
        return (
          <div className="text-center">
            <div className="animate-spin h-16 w-16 mx-auto mb-4 border-4 border-[var(--accent)] border-t-transparent rounded-full" />
            <h1 className="text-2xl font-bold mb-2">
              Processing your upgrade...
            </h1>
            <p className="text-[var(--gray-400)]">
              Please wait while we verify your payment and activate your Pro
              features.
            </p>
          </div>
        );

      case "success":
        return (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-[var(--accent)] rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-black"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold mb-4 text-[var(--accent)]">
              Welcome to Pro! 🎉
            </h1>
            <p className="text-lg text-[var(--gray-300)] mb-8">
              Your payment was successful and your account has been upgraded.
              You now have access to all Pro features:
            </p>
            <ul className="text-left mb-8 space-y-3 max-w-sm mx-auto">
              <li className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-[var(--accent)] flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Unlimited resume scans</span>
              </li>
              <li className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-[var(--accent)] flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Unlimited cover letters</span>
              </li>
              <li className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-[var(--accent)] flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Unlimited job matching</span>
              </li>
              <li className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-[var(--accent)] flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>All tone options</span>
              </li>
              <li className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-[var(--accent)] flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Live interview practice</span>
              </li>
            </ul>
            <div className="space-y-3">
              <Link
                href="/dashboard"
                className="inline-block px-8 py-3 bg-[var(--accent)] text-black font-semibold rounded-lg hover:opacity-90 transition transform hover:-translate-y-1"
              >
                Go to Dashboard
              </Link>
              <p className="text-sm text-[var(--gray-400)]">
                You can start using your Pro features immediately!
              </p>
            </div>
          </div>
        );

      case "already_processed":
        return (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-blue-500 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-4">Already Upgraded!</h1>
            <p className="text-[var(--gray-300)] mb-8">
              This payment has already been processed and your account is
              already on the Pro plan.
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-2 bg-[var(--accent)] text-black font-medium rounded-lg hover:opacity-90 transition"
            >
              Go to Dashboard
            </Link>
          </div>
        );

      case "unauthorized":
        return (
          <div className="text-center">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-yellow-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <h1 className="text-2xl font-bold mb-2">Authentication Required</h1>
            <p className="text-[var(--gray-400)] mb-6">
              Please log in to complete your upgrade process.
            </p>
            <Link
              href="/login"
              className="px-6 py-2 bg-[var(--accent)] text-black font-medium rounded-lg hover:opacity-90 transition"
            >
              Log In
            </Link>
          </div>
        );

      case "error":
      default:
        return (
          <div className="text-center">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h1 className="text-2xl font-bold mb-2">
              Payment Verification Failed
            </h1>
            <p className="text-[var(--gray-400)] mb-6">
              {errorMessage ||
                "We encountered an issue verifying your payment. Please try again or contact support."}
            </p>
            <div className="space-x-4">
              <button
                onClick={handleRetry}
                className="px-6 py-2 bg-[var(--accent)] text-black font-medium rounded-lg hover:opacity-90 transition"
              >
                Try Again
              </button>
              <Link
                href="/dashboard"
                className="px-6 py-2 bg-[var(--neutral-700)] text-[var(--gray-200)] font-medium rounded-lg hover:bg-[var(--neutral-600)] transition"
              >
                Back to Dashboard
              </Link>
            </div>
            <p className="text-sm text-[var(--gray-500)] mt-4">
              If this problem persists, please contact support with your session
              details.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center p-4">
      <div className="max-w-md w-full">{renderContent()}</div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="animate-spin h-12 w-12 border-4 border-[var(--accent)] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <SuccessPageContent />
    </Suspense>
  );
}
