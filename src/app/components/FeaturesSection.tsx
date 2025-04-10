
import React from 'react';

const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 bg-[#212121]">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12 leading-tight tracking-tight">
          Why Choose Our Service?
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-[var(--accent)] p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-black mb-3 leading-snug tracking-tight">
              AI-Powered Resume Analysis
            </h3>
            <p className="text-black">
              Get an ATS-optimized review of your resume with actionable metrics and tailored suggestions.
            </p>
          </div>
          <div className="bg-[var(--accent)] p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-black mb-3 leading-snug tracking-tight">
              Comprehensive GitHub & Portfolio Review
            </h3>
            <p className="text-black">
              Showcase your projects with clarity—highlight your strengths and uncover opportunities for improvement.
            </p>
          </div>
          <div className="bg-[var(--accent)] p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-black mb-3 leading-snug tracking-tight">
              LinkedIn & Job-Match Critique
            </h3>
            <p className="text-black">
              Compare your profile against job descriptions and get personalized insights to land your dream role.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
