"use client";

import React, { useState } from "react";
import PageHeader from "../components/PageHeader";

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
          if (firstError.path.includes("message")) {
            setErrorMessage("Message must be at least 10 characters long");
          } else if (firstError.path.includes("name")) {
            setErrorMessage("Name must be at least 2 characters long");
          } else if (firstError.path.includes("email")) {
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
    } catch (error: unknown) {
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
    <div className="page-shell">
      <div className="page-inner">
        <PageHeader
          label="Contact"
          title="Get in touch"
          description="Have questions about ScreenMe? We're here to help you succeed in your career journey."
          centered
        />

        <div className="grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            <div className="card p-8">
              <h2 className="text-xl font-semibold text-fg mb-6">
                Send us a message
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-5">
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="input"
                    placeholder="Your name"
                  />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="input"
                    placeholder="Email address"
                  />
                </div>

                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                  className="input"
                >
                  <option value="">Select a topic</option>
                  <option value="resume-help">Resume Help</option>
                  <option value="job-search">Job Search Advice</option>
                  <option value="technical-support">Technical Support</option>
                  <option value="feature-request">Feature Request</option>
                  <option value="partnership">Partnership</option>
                  <option value="other">Other</option>
                </select>

                <div>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    rows={5}
                    maxLength={2000}
                    className="textarea"
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

                {submitStatus === "success" && (
                  <div className="alert-success" role="status">
                    Message sent — we&apos;ll get back to you soon.
                  </div>
                )}

                {errorMessage && (
                  <div className="alert-error" role="alert">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary w-full py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-accent-fg border-t-transparent" />
                      Sending...
                    </span>
                  ) : (
                    "Send Message"
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-6">
              <div className="flex items-center mb-4">
                <div className="icon-box mr-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" className="stroke-fg fill-none" strokeWidth="1.5">
                    <polyline points="22,6 12,13 2,6" />
                    <rect x="2" y="6" width="20" height="14" rx="2" ry="2" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-fg">
                    Email Support
                  </h3>
                  <p className="text-sm text-fg-muted">
                    help@screenme.dev
                  </p>
                </div>
              </div>
              <p className="text-sm text-fg-muted">
                We typically respond within 24 hours
              </p>
            </div>

            <div className="card p-6">
              <h3 className="text-base font-semibold text-fg mb-4">
                Response Times
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-fg-muted">General inquiries</span>
                  <span className="text-sm text-fg font-medium">24 hours</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-fg-muted">Technical support</span>
                  <span className="text-sm text-fg font-medium">12 hours</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-fg-muted">Urgent issues</span>
                  <span className="text-sm text-fg font-medium">4 hours</span>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-base font-semibold text-fg mb-5">
                Frequently Asked Questions
              </h3>
              <div className="space-y-5">
                <div>
                  <h4 className="font-medium text-fg mb-1.5 text-sm">
                    How accurate is the resume scoring?
                  </h4>
                  <p className="text-sm text-fg-muted leading-relaxed">
                    Our AI analyzes resumes using industry best practices and ATS optimization standards to provide accurate, actionable feedback.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-fg mb-1.5 text-sm">
                    Can I use this for any industry?
                  </h4>
                  <p className="text-sm text-fg-muted leading-relaxed">
                    Yes! Our system adapts to different industries and job levels, providing tailored recommendations for your specific field.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-fg mb-1.5 text-sm">
                    Is my data secure?
                  </h4>
                  <p className="text-sm text-fg-muted leading-relaxed">
                    Absolutely. We use enterprise-grade security and never share your information with third parties.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-fg mb-1.5 text-sm">
                    How many resumes can I analyze?
                  </h4>
                  <p className="text-sm text-fg-muted leading-relaxed">
                    Free users can analyze up to 3 resumes per month. Premium users get unlimited analysis and advanced features.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
