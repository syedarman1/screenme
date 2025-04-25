import React from 'react';

const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 bg-[#212121]">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12 leading-tight tracking-tight">
          Why Choose ScreenMe?
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {/* Resume Analysis */}
          <div className="bg-[var(--accent)] p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-black mb-3 leading-snug tracking-tight">
              AI-Powered Resume Analysis
            </h3>
            <p className="text-black">
              Get an ATS-optimized scan of your resume with a clear readiness score and tailored suggestions.
            </p>
          </div>

          {/* Cover Letter Generator */}
          <div className="bg-[var(--accent)] p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-black mb-3 leading-snug tracking-tight">
              Cover Letter Generator
            </h3>
            <p className="text-black">
              Instantly craft a narrative-style cover letter—choose your tone, edit in place, and download.
            </p>
          </div>

          {/* Interview Prep */}
          <div className="bg-[var(--accent)] p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-black mb-3 leading-snug tracking-tight">
              Interview Prep
            </h3>
            <p className="text-black">
              Practice with AI-generated questions and model answers tailored to your target role.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
