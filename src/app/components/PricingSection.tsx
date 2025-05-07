"use client";

import React from 'react';

type PricingPlan = {
  title: string;
  price: string;
  period?: string;
  features: string[];
  buttonText: string;
  isFeatured?: boolean;
  priceId?: string;
  onClick?: () => void;
};

const PRICING_PLANS: PricingPlan[] = [
  {
    title: "Free",
    price: "$0",
    period: "/mo",
    features: [
      "2× Resume scans",
      "1× Cover letter",
      "1× Job-match analysis",
      "Email support"
    ],
    buttonText: "Get Started",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_FREE,
  },
  {
    title: "Pro",
    price: "$15",
    period: "/mo",
    features: [
      "Unlimited resume scans",
      "Unlimited cover letters (tone-switch & edits)",
      "Unlimited job-match analysis",
      "Unlimited interview prep Q&A"
    ],
    buttonText: "Go Pro",
    isFeatured: true,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
  },
  {
    title: "Enterprise",
    price: "Custom",
    features: [
      "All Pro features",
      "Team seats & usage analytics",
      "Dedicated support & SLAs"
    ],
    buttonText: "Contact Us",
  },
];

const PricingCard = ({ plan }: { plan: PricingPlan }) => {
  const handleCheckout = async () => {
    if (!plan.priceId) {
      // For Enterprise plan, redirect to a contact page
      window.location.href = "/contact";
      return;
    }

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: plan.priceId,
          userId: "user_123", // Replace with actual user ID from your auth system
        }),
      });

      const { url } = await response.json();
      if (url) {
        window.location.href = url; // Redirect directly to Stripe Checkout
      }
    } catch (error) {
      console.error('Error initiating checkout:', error);
    }
  };

  return (
    <div
      className={`
        bg-[var(--neutral-800)] p-6 rounded-lg text-center
        border-2 ${plan.isFeatured ? 'border-[var(--accent)] scale-105' : 'border-[var(--neutral-700)]'}
        flex flex-col transition-transform duration-200 ease-in-out
      `}
    >
      <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">
        {plan.title}
      </h3>

      <p className="text-3xl font-bold text-[var(--foreground)] mb-4">
        {plan.price}
        {plan.period && (
          <span className="text-sm font-normal text-[var(--gray-400)]">
            {plan.period}
          </span>
        )}
      </p>

      <ul className="text-[var(--gray-300)] mb-6 space-y-2 text-sm text-left px-4 flex-grow">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-[var(--accent)] flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={handleCheckout}
        className="
          mt-auto bg-[var(--accent)] text-black font-semibold px-6 py-2 rounded-lg
          relative overflow-hidden transition-all duration-300
          hover:opacity-90 hover:shadow-lg pricing-button
        "
      >
        {plan.buttonText}
      </button>
    </div>
  );
};

export default function PricingSection() {
  return (
    <section id="pricing" className="py-20 bg-[var(--background)]">
      <style>{`
        @keyframes bubble {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .pricing-button::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.2), transparent);
          animation: bubble 3s infinite linear;
        }
      `}</style>
      <div className="container mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-[var(--foreground)] text-center mb-12">
          Simple, Transparent Pricing
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
          {PRICING_PLANS.map(plan => (
            <PricingCard key={plan.title} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
}