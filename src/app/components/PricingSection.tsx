import React from 'react';

const PricingSection = () => {
  return (
    <section id="pricing" className="py-20 bg-[#212121]">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
          Simple, Transparent Pricing
        </h2>
        <div className="grid md:grid-cols-4 gap-8">
          {/* Free Plan */}
          <div className="bg-[#2a2a2a] p-6 rounded-lg text-center border-2 border-[var(--accent)]">
            <h3 className="text-xl font-semibold text-white mb-2">Free</h3>
            <p className="text-3xl font-bold text-white mb-4">$0<span className="text-sm">/mo</span></p>
            <ul className="text-gray-300 mb-6 space-y-2">
              <li>1× AI-resume scan</li>
              <li>1× Cover-letter draft</li>
              <li>Email support</li>
            </ul>
            <button className="bg-[var(--accent)] text-black font-semibold px-6 py-2 rounded-lg hover:opacity-90 transition">
              Get Started
            </button>
          </div>
          {/* Basic Plan */}
          <div className="bg-[#2a2a2a] p-6 rounded-lg text-center border-2 border-[var(--accent)]">
            <h3 className="text-xl font-semibold text-white mb-2">Basic</h3>
            <p className="text-3xl font-bold text-white mb-4">$7<span className="text-sm">/mo</span></p>
            <ul className="text-gray-300 mb-6 space-y-2">
              <li>Unlimited resume scans</li>
              <li>Cover-letter generator</li>
              <li>LinkedIn critique</li>
            </ul>
            <button className="bg-[var(--accent)] text-black font-semibold px-6 py-2 rounded-lg hover:opacity-90 transition">
              Choose Basic
            </button>
          </div>
          {/* Pro Plan */}
          <div className="bg-[#2a2a2a] p-6 rounded-lg text-center border-2 border-[var(--accent)]">
            <h3 className="text-xl font-semibold text-white mb-2">Pro</h3>
            <p className="text-3xl font-bold text-white mb-4">$15<span className="text-sm">/mo</span></p>
            <ul className="text-gray-300 mb-6 space-y-2">
              <li>All Basic features</li>
              <li>Job-match analysis</li>
              <li>Interview prep Q&A</li>
            </ul>
            <button className="bg-[var(--accent)] text-black font-semibold px-6 py-2 rounded-lg hover:opacity-90 transition">
              Go Pro
            </button>
          </div>
          {/* Enterprise Plan */}
          <div className="bg-[#2a2a2a] p-6 rounded-lg text-center border-2 border-[var(--accent)]">
            <h3 className="text-xl font-semibold text-white mb-2">Enterprise</h3>
            <p className="text-3xl font-bold text-white mb-4">Custom</p>
            <ul className="text-gray-300 mb-6 space-y-2">
              <li>All Pro features</li>
              <li>Team seats & analytics</li>
              <li>Dedicated support & SLA</li>
            </ul>
            <button className="bg-[var(--accent)] text-black font-semibold px-6 py-2 rounded-lg hover:opacity-90 transition">
              Contact Us
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
