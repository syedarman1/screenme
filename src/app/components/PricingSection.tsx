// Component definition - no React import needed usually
// Define the structure for pricing plan data
type PricingPlan = {
  title: string;
  price: string;
  period?: string; // Optional, e.g., "/mo"
  features: string[];
  buttonText: string;
  isFeatured?: boolean; // Optional flag to highlight a plan
};

// Data array for the pricing plans
const PRICING_PLANS: PricingPlan[] = [
  {
    title: "Free",
    price: "$0",
    period: "/mo",
    features: ["1× AI-resume scan", "1× Cover-letter draft", "Email support"],
    buttonText: "Get Started",
  },
  {
    title: "Basic",
    price: "$7",
    period: "/mo",
    features: [
      "Unlimited resume scans",
      "Cover-letter generator",
      "LinkedIn critique",
    ],
    buttonText: "Choose Basic",
    // isFeatured: true, // Example: Uncomment to highlight this plan
  },
  {
    title: "Pro",
    price: "$15",
    period: "/mo",
    features: [
      "All Basic features",
      "Job-match analysis",
      "Interview prep Q&A",
    ],
    buttonText: "Go Pro",
  },
  {
    title: "Enterprise",
    price: "Custom",
    features: [
      "All Pro features",
      "Team seats & analytics",
      "Dedicated support & SLA",
    ],
    buttonText: "Contact Us",
  },
];

// Reusable Pricing Card Component
const PricingCard = ({ plan }: { plan: PricingPlan }) => (
  // Use CSS Variables for background and text colors
  // Added subtle scale effect on hover for featured plan
  <div className={`
    bg-[var(--neutral-800)] p-6 rounded-lg text-center
    border-2 ${plan.isFeatured ? 'border-[var(--accent)] scale-105' : 'border-[var(--neutral-700)]'}
    flex flex-col transition-transform duration-200 ease-in-out
  `}>
    {/* Plan Title */}
    <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">{plan.title}</h3>

    {/* Price */}
    <p className="text-3xl font-bold text-[var(--foreground)] mb-4">
      {plan.price}
      {plan.period && <span className="text-sm font-normal text-[var(--gray-400)]">{plan.period}</span>}
    </p>

    {/* Features List */}
    <ul className="text-[var(--gray-300)] mb-6 space-y-2 text-sm text-left px-4 flex-grow"> {/* Added flex-grow */}
      {plan.features.map((feature, index) => (
        <li key={index} className="flex items-start gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[var(--accent)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>{feature}</span>
        </li>
      ))}
    </ul>

    {/* Call to Action Button */}
    <button className="mt-auto bg-[var(--accent)] text-black font-semibold px-6 py-2 rounded-lg hover:opacity-90 transition w-full">
      {plan.buttonText}
    </button>
  </div>
);

// Main Pricing Section Component
const PricingSection = () => {
  return (
    // Use CSS variable for section background
    <section id="pricing" className="py-20 bg-[var(--background)]]">
      <div className="container mx-auto px-6">
        {/* Use CSS variable for title color */}
        <h2 className="text-3xl md:text-4xl font-bold text-[var(--foreground)] text-center mb-12">
          Simple, Transparent Pricing
        </h2>
        {/* Grid layout for pricing cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch"> {/* Adjusted grid columns for responsiveness, added items-stretch */}
          {/* Map over the data to render cards */}
          {PRICING_PLANS.map((plan) => (
            <PricingCard key={plan.title} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;