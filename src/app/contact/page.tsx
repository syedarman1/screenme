"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      setSubmitStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error: any) {
      console.error('Contact form error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-[var(--background)] relative">

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header Section */}
          <div className="text-center mb-16">
            <motion.h1
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-5xl md:text-6xl font-bold text-[var(--gray-100)] mb-6"
            >
              Let's Connect
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl text-[var(--gray-300)] max-w-2xl mx-auto leading-relaxed"
            >
              Have questions about your resume? Need help with your job search? 
              We're here to help you succeed in your career journey.
            </motion.p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="bg-[var(--neutral-800)] rounded-2xl p-8 border border-[var(--neutral-700)] shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-[var(--gray-100)] mb-6">
                Send us a Message
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[var(--gray-300)] text-sm font-medium mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-[var(--neutral-700)] border border-[var(--neutral-600)] rounded-lg text-[var(--gray-100)] placeholder-[var(--gray-500)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all duration-200"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--gray-300)] text-sm font-medium mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-[var(--neutral-700)] border border-[var(--neutral-600)] rounded-lg text-[var(--gray-100)] placeholder-[var(--gray-500)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all duration-200"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[var(--gray-300)] text-sm font-medium mb-2">
                    Subject
                  </label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-[var(--neutral-700)] border border-[var(--neutral-600)] rounded-lg text-[var(--gray-100)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all duration-200"
                  >
                    <option value="">Select a topic</option>
                    <option value="resume-help">Resume Help</option>
                    <option value="job-search">Job Search Advice</option>
                    <option value="technical-support">Technical Support</option>
                    <option value="feature-request">Feature Request</option>
                    <option value="partnership">Partnership</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--gray-300)] text-sm font-medium mb-2">
                    Message
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    rows={6}
                    className="w-full px-4 py-3 bg-[var(--neutral-700)] border border-[var(--neutral-600)] rounded-lg text-[var(--gray-100)] placeholder-[var(--gray-500)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all duration-200 resize-none"
                    placeholder="Tell us how we can help you..."
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-[var(--accent)] to-[#fbbf24] text-black font-bold py-4 px-6 rounded-lg hover:from-[#fbbf24] hover:to-[var(--accent)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2"></div>
                      Sending...
                    </div>
                  ) : (
                    'Send Message'
                  )}
                </motion.button>

                <AnimatePresence>
                  {submitStatus === 'success' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-green-900/20 border border-green-800 text-green-300 px-4 py-3 rounded-lg text-center"
                    >
                      ✅ Message sent successfully! We'll get back to you soon.
                    </motion.div>
                  )}
                  {submitStatus === 'error' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-red-900/20 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-center"
                    >
                      ❌ Something went wrong. Please try again.
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </motion.div>

            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="space-y-8"
            >
              {/* Quick Contact Cards */}
              <div className="space-y-6">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-to-br from-[var(--neutral-800)] to-[var(--neutral-700)] p-6 rounded-xl border border-[var(--neutral-600)] hover:border-[var(--accent)] transition-all duration-300"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-[var(--accent)] rounded-lg flex items-center justify-center text-black text-xl">
                      📧
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--gray-100)]">Email Us</h3>
                      <p className="text-[var(--gray-300)]">support@screenme.com</p>
                      <p className="text-sm text-[var(--gray-400)]">We typically respond within 24 hours</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-to-br from-[var(--neutral-800)] to-[var(--neutral-700)] p-6 rounded-xl border border-[var(--neutral-600)] hover:border-[var(--accent)] transition-all duration-300"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-[var(--accent)] rounded-lg flex items-center justify-center text-black text-xl">
                      💬
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--gray-100)]">Live Chat</h3>
                      <p className="text-[var(--gray-300)]">Available during business hours</p>
                      <p className="text-sm text-[var(--gray-400)]">Get instant help with your questions</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-to-br from-[var(--neutral-800)] to-[var(--neutral-700)] p-6 rounded-xl border border-[var(--neutral-600)] hover:border-[var(--accent)] transition-all duration-300"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-[var(--accent)] rounded-lg flex items-center justify-center text-black text-xl">
                      📚
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--gray-100)]">Help Center</h3>
                      <p className="text-[var(--gray-300)]">Browse our knowledge base</p>
                      <p className="text-sm text-[var(--gray-400)]">Find answers to common questions</p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* FAQ Section */}
              <div className="bg-[var(--neutral-800)] rounded-xl p-6 border border-[var(--neutral-700)]">
                <h3 className="text-xl font-bold text-[var(--gray-100)] mb-4">
                  Frequently Asked Questions
                </h3>
                <div className="space-y-4">
                  <div className="border-l-4 border-[var(--accent)] pl-4">
                    <h4 className="font-semibold text-[var(--gray-100)]">How accurate is the resume scoring?</h4>
                    <p className="text-sm text-[var(--gray-300)] mt-1">
                      Our AI analyzes resumes using industry best practices and ATS optimization standards.
                    </p>
                  </div>
                  <div className="border-l-4 border-[var(--accent)] pl-4">
                    <h4 className="font-semibold text-[var(--gray-100)]">Can I use this for any industry?</h4>
                    <p className="text-sm text-[var(--gray-300)] mt-1">
                      Yes! Our system adapts to different industries and job levels.
                    </p>
                  </div>
                  <div className="border-l-4 border-[var(--accent)] pl-4">
                    <h4 className="font-semibold text-[var(--gray-100)]">Is my data secure?</h4>
                    <p className="text-sm text-[var(--gray-300)] mt-1">
                      Absolutely. We use enterprise-grade security and never share your information.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ContactPage; 