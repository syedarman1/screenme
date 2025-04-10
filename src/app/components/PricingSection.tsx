
import React from 'react';

const PricingSection = () => {
  return (
    <section id="pricing" className="py-20 bg-[#212121]">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
          Simple, Transparent Pricing
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {/* Free Plan */}
          <div className="bg-[#212121] p-6 rounded-lg shadow-md text-center border-2 border-[var(--accent)]">
            <h3 className="text-xl font-semibold text-white mb-4">Free</h3>
            <p className="text-3xl font-bold text-white mb-4">
              $0<span className="text-sm text-white">/mo</span>
            </p>
            <ul className="text-white mb-6 space-y-2">
              <li>Basic AI Resume Review</li>
              <li>ATS Compliance Check</li>
              <li>Email Support</li>
            </ul>
            <button className="bg-[var(--accent)] text-black font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition duration-200">
              Get Started
            </button>
          </div>
          {/* Pro Plan */}
          <div className="bg-[#212121] p-6 rounded-lg shadow-md text-center border-2 border-[var(--accent)]">
            <h3 className="text-xl font-semibold text-white mb-4">Pro</h3>
            <p className="text-3xl font-bold text-white mb-4">
              $9<span className="text-sm text-white">/mo</span>
            </p>
            <ul className="text-white mb-6 space-y-2">
              <li>Advanced Resume, GitHub & Portfolio Analysis</li>
              <li>LinkedIn Profile Critique</li>
              <li>Job-Match Insights</li>
            </ul>
            <button className="bg-[var(--accent)] text-black font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition duration-200">
              Try Pro
            </button>
          </div>
          {/* Enterprise Plan */}
          <div className="bg-[#212121] p-6 rounded-lg shadow-md text-center border-2 border-[var(--accent)]">
            <h3 className="text-xl font-semibold text-white mb-4">Enterprise</h3>
            <p className="text-3xl font-bold text-white mb-4">Custom</p>
            <ul className="text-white mb-6 space-y-2">
              <li>Full AI-Powered Profile Review</li>
              <li>Team & Enterprise Solutions</li>
              <li>Dedicated Support & Custom Reports</li>
            </ul>
            <button className="bg-[var(--accent)] text-black font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition duration-200">
              Contact Us
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
