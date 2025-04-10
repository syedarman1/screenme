
import React from 'react';

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-20 bg-[#212121]">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-100 text-center mb-12">
          How It Works
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="text-center p-6 bg-[#2a2a2a] rounded-md transition-transform transform hover:scale-105 hover:bg-[#3a3a3a] hover:shadow-lg">
            <div className="text-4xl font-bold text-[var(--accent)] mb-4">1</div>
            <h3 className="text-xl font-semibold text-gray-100 mb-3">Submit Your Information</h3>
            <p className="text-gray-300">
              Upload your resume, connect your GitHub and LinkedIn, and provide the job description.
            </p>
          </div>
          {/* Step 2 */}
          <div className="text-center p-6 bg-[#2a2a2a] rounded-md transition-transform transform hover:scale-105 hover:bg-[#3a3a3a] hover:shadow-lg">
            <div className="text-4xl font-bold text-[var(--accent)] mb-4">2</div>
            <h3 className="text-xl font-semibold text-gray-100 mb-3">AI Analysis in Action</h3>
            <p className="text-gray-300">
              Our AI reviews your details for ATS compliance and job-fit, pinpointing areas for improvement.
            </p>
          </div>
          {/* Step 3 */}
          <div className="text-center p-6 bg-[#2a2a2a] rounded-md transition-transform transform hover:scale-105 hover:bg-[#3a3a3a] hover:shadow-lg">
            <div className="text-4xl font-bold text-[var(--accent)] mb-4">3</div>
            <h3 className="text-xl font-semibold text-gray-100 mb-3">Receive Actionable Feedback</h3>
            <p className="text-gray-300">
              Get a comprehensive report with tailored recommendations to elevate your application.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
