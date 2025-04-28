// No React import needed generally

// --- Data Definition for Steps ---
type HowItWorksStep = {
  stepNumber: number;
  title: string;
  description: string;
};

const STEPS_DATA: HowItWorksStep[] = [
  {
    stepNumber: 1,
    title: "Submit Your Information",
    description:
      "Upload your resume, connect your GitHub and LinkedIn, and provide the job description.",
  },
  {
    stepNumber: 2,
    title: "AI Analysis in Action",
    description:
      "Our AI reviews your details for ATS compliance and job-fit, pinpointing areas for improvement.",
  },
  {
    stepNumber: 3,
    title: "Receive Actionable Feedback",
    description:
      "Get a comprehensive report with tailored recommendations to elevate your application.",
  },
];

// --- Reusable Step Card Component ---
const StepCard = ({ step }: { step: HowItWorksStep }) => (
  // Use CSS variables for background, text, and hover states
  <div className="text-center p-6 bg-[var(--neutral-800)] rounded-md transition-transform transform hover:scale-105 hover:bg-[var(--neutral-700)] hover:shadow-lg">
    {/* Step Number */}
    <div className="text-4xl font-bold text-[var(--accent)] mb-4">
      {step.stepNumber}
    </div>
    {/* Step Title */}
    <h3 className="text-xl font-semibold text-[var(--foreground)] mb-3"> {/* Use foreground */}
      {step.title}
    </h3>
    {/* Step Description */}
    <p className="text-[var(--gray-300)] text-sm"> {/* Use variable, maybe smaller text */}
      {step.description}
    </p>
  </div>
);

// --- Main How It Works Section Component ---
const HowItWorksSection = () => {
  return (
    // Use CSS variable for section background
    <section id="how-it-works" className="py-20 bg-[var(--background)]]"> {/* Use variable */}
      <div className="container mx-auto px-6">
        {/* Use CSS variable for title color */}
        <h2 className="text-3xl md:text-4xl font-bold text-[var(--foreground)] text-center mb-12">
          How It Works
        </h2>
        {/* Grid for steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Map over the data to render step cards */}
          {STEPS_DATA.map((step) => (
            <StepCard key={step.stepNumber} step={step} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;