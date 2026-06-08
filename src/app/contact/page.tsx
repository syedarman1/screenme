"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    if (formData.message.length < 10) {
      setErrorMessage("Message must be at least 10 characters long");
      return;
    }
    
    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details && data.details.length > 0) {
          const firstError = data.details[0];
          if (firstError.path.includes('message')) {
            setErrorMessage("Message must be at least 10 characters long");
          } else if (firstError.path.includes('name')) {
            setErrorMessage("Name must be at least 2 characters long");
          } else if (firstError.path.includes('email')) {
            setErrorMessage("Please enter a valid email address");
          } else {
            setErrorMessage(firstError.message || "Please check your input");
          }
        } else {
          setErrorMessage(data.error || "Failed to send message");
        }
        setSubmitStatus("error");
      } else {
        setSubmitStatus("success");
        setFormData({ name: "", email: "", subject: "", message: "" });
      }
    } catch (error: any) {
      console.error("Contact form error:", error);
      setErrorMessage("Network error. Please try again.");
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-light text-fg mb-4"
          >
            Contact Us
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-lg text-fg-subtle max-w-2xl mx-auto"
          >
            Have questions about ScreenMe? We're here to help you succeed in your career journey.
          </motion.p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-2"
            >
              <div className="bg-surface rounded-2xl p-8 border border-border">
                <h2 className="text-2xl font-light text-fg mb-8">
                  Send us a message
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-4 bg-surface border border-border rounded-xl text-fg placeholder:text-fg-subtle focus:outline-none focus:border-border-2 transition-colors"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-4 bg-surface border border-border rounded-xl text-fg placeholder:text-fg-subtle focus:outline-none focus:border-border-2 transition-colors"
                        placeholder="Email address"
                      />
                    </div>
                  </div>

                  <div>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-4 bg-surface border border-border rounded-xl text-fg focus:outline-none focus:border-border-2 transition-colors"
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
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows={5}
                      maxLength={2000}
                      className="w-full px-4 py-4 bg-surface border border-border rounded-xl text-fg placeholder:text-fg-subtle focus:outline-none focus:border-border-2 transition-colors resize-none"
                      placeholder="Tell us how we can help you... (minimum 10 characters)"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-fg-muted">
                        Minimum 10 characters required
                      </span>
                      <span className="text-xs text-fg-muted">
                        {formData.message.length}/2000
                      </span>
                    </div>
                  </div>

                  <button
                    disabled={isSubmitting}
                    className="w-full bg-[var(--accent)] text-black font-medium py-4 px-6 rounded-lg hover:bg-[#e6b800] transition-all duration-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2"></div>
                        Sending...
                      </div>
                    ) : submitStatus === "success" ? (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center justify-center"
                      >
                        Sent ✓
                      </motion.div>
                    ) : (
                      "Send Message"
                    )}
                  </button>

                  {errorMessage && (
                    <div className="text-red-400 text-sm text-center">
                      {errorMessage}
                    </div>
                  )}


                </form>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="space-y-8"
            >
              <div className="bg-surface rounded-2xl p-6 border border-border">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-surface-2 border border-border rounded-lg flex items-center justify-center mr-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" className="stroke-fg fill-none" strokeWidth="1.5">
                      <polyline points="22,6 12,13 2,6" />
                      <rect x="2" y="6" width="20" height="14" rx="2" ry="2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-fg">
                      Email Support
                    </h3>
                    <p className="text-sm text-fg-subtle">
                      help@screenme.dev
                    </p>
                  </div>
                </div>
                <p className="text-sm text-fg-muted">
                  We typically respond within 24 hours
                </p>
              </div>

              <div className="bg-surface rounded-2xl p-6 border border-border">
                <h3 className="text-lg font-medium text-fg mb-4">
                  Response Times
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-fg-subtle">General inquiries</span>
                    <span className="text-sm text-[var(--accent)] font-medium">24 hours</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-fg-subtle">Technical support</span>
                    <span className="text-sm text-[var(--accent)] font-medium">12 hours</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-fg-subtle">Urgent issues</span>
                    <span className="text-sm text-[var(--accent)] font-medium">4 hours</span>
                  </div>
                </div>
              </div>

              <div className="bg-surface rounded-2xl p-6 border border-border">
                <h3 className="text-lg font-medium text-fg mb-6">
                  Frequently Asked Questions
                </h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-fg mb-2">
                      How accurate is the resume scoring?
                    </h4>
                    <p className="text-sm text-fg-subtle leading-relaxed">
                      Our AI analyzes resumes using industry best practices and ATS optimization standards to provide accurate, actionable feedback.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-fg mb-2">
                      Can I use this for any industry?
                    </h4>
                    <p className="text-sm text-fg-subtle leading-relaxed">
                      Yes! Our system adapts to different industries and job levels, providing tailored recommendations for your specific field.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-fg mb-2">
                      Is my data secure?
                    </h4>
                    <p className="text-sm text-fg-subtle leading-relaxed">
                      Absolutely. We use enterprise-grade security and never share your information with third parties.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-fg mb-2">
                      How many resumes can I analyze?
                    </h4>
                    <p className="text-sm text-fg-subtle leading-relaxed">
                      Free users can analyze up to 3 resumes per month. Premium users get unlimited analysis and advanced features.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
