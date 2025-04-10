
import React from 'react';

const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="py-20 bg-[#212121]">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-100 text-center mb-12">
          What Our Users Say
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-[var(--accent)] p-6 rounded-lg shadow-md">
            <p className="text-black mb-4">
              "This all-in-one service transformed my job search—my resume, GitHub, portfolio, and LinkedIn are now perfectly aligned with what recruiters need!"
            </p>
            <p className="text-black font-semibold">- Jane D., Software Engineer</p>
          </div>
          <div className="bg-[var(--accent)] p-6 rounded-lg shadow-md">
            <p className="text-black mb-4">
              "The AI analysis gave me detailed, actionable insights that improved every aspect of my professional profile."
            </p>
            <p className="text-black font-semibold">- Mark S., Data Analyst</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
