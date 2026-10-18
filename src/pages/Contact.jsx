import React, { useState } from 'react';
import {
  Mail,
  Phone,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Code2,
  Send,
  MessageSquare
} from 'lucide-react';
import api from '../services/api.js';

const SUBJECT_OPTIONS = [
  'General Inquiry',
  'Website Development',
  'AI & Automation',
  'Cybersecurity',
  'Design Services',
  'Other',
];

export default function Contact({ services = [], PageHero }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'General Inquiry',
    projectType: '',
    message: '',
    hp_website: '', // Honeypot anti-spam trap
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = 'Please enter your name (at least 2 characters)';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.subject.trim()) {
      newErrors.subject = 'Please select a subject';
    }
    if (!formData.message.trim() || formData.message.trim().length < 10) {
      newErrors.message = 'Please provide details about your inquiry (minimum 10 characters)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || submitting) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await api.sendContactMessage({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        subject: formData.subject.trim(),
        projectType: formData.projectType.trim() || undefined,
        message: formData.message.trim(),
        hp_website: formData.hp_website,
      });

      setSubmitted(true);
      setFormData({
        name: '',
        email: '',
        subject: 'General Inquiry',
        projectType: '',
        message: '',
        hp_website: '',
      });
    } catch (err) {
      console.error('Contact submission error:', err);
      setErrorMessage(err.message || 'Unable to send your message. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHero
        eyebrow="CONTACT"
        title="Let's"
        accent="Talk."
        desc="Have an idea, a project, or a technical inquiry? We'd love to hear from you. Send us a message and our team will get back to you promptly."
      />

      <section className="section contact">
        <div className="container contact-grid">
          {/* Main Contact Form Card */}
          <div className="form-card">
            <span className="eyebrow">SEND A MESSAGE</span>
            <h2>
              Tell Us About <em>Your Idea.</em>
            </h2>
            <p>Fill out the form below and we'll get back to you as soon as possible.</p>

            {errorMessage && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '0.85rem',
                  borderRadius: '8px',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  fontSize: '0.88rem',
                }}
              >
                <AlertCircle size={18} flexShrink={0} />
                <div>{errorMessage}</div>
              </div>
            )}

            {submitted ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3rem 1.5rem',
                  background: '#fffaf7',
                  borderRadius: '12px',
                  border: '1px solid #ffd5c0',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: '#dcfce7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                  }}
                >
                  <CheckCircle2 size={32} color="#16a34a" />
                </div>
                <h3 style={{ fontSize: '1.4rem', margin: '0 0 0.5rem', color: '#111827' }}>
                  Message Sent Successfully!
                </h3>
                <p style={{ color: '#4b5563', maxWidth: '380px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
                  Thank you for reaching out to VELANTIS. We have received your message and will review it and reply within 24 hours.
                </p>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setSubmitted(false)}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                {/* Honeypot field (hidden from humans, catches automated spam bots) */}
                <div style={{ display: 'none', position: 'absolute', left: '-9999px' }} aria-hidden="true">
                  <label htmlFor="hp_website">Do not fill this field</label>
                  <input
                    type="text"
                    id="hp_website"
                    name="hp_website"
                    tabIndex="-1"
                    autoComplete="off"
                    value={formData.hp_website}
                    onChange={(e) => handleChange('hp_website', e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <label>
                    Your Name *
                    <input
                      type="text"
                      placeholder="Enter your name"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className={errors.name ? 'input-error' : ''}
                    />
                    {errors.name && <span className="field-error">{errors.name}</span>}
                  </label>

                  <label>
                    Your Email *
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className={errors.email ? 'input-error' : ''}
                    />
                    {errors.email && <span className="field-error">{errors.email}</span>}
                  </label>
                </div>

                <div className="form-row">
                  <label>
                    Subject *
                    <select
                      value={formData.subject}
                      onChange={(e) => handleChange('subject', e.target.value)}
                    >
                      {SUBJECT_OPTIONS.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Project Type (Optional)
                    <select
                      value={formData.projectType}
                      onChange={(e) => handleChange('projectType', e.target.value)}
                    >
                      <option value="">Select an option</option>
                      {services.map((s) => {
                        const name = Array.isArray(s) ? s[0] : s.name;
                        return (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                </div>

                <label>
                  Your Message *
                  <textarea
                    rows={5}
                    placeholder="Tell us about your project idea, requirements, timeline, or any questions you have..."
                    value={formData.message}
                    onChange={(e) => handleChange('message', e.target.value)}
                    className={errors.message ? 'input-error' : ''}
                  />
                  {errors.message && <span className="field-error">{errors.message}</span>}
                </label>

                <button type="submit" className="btn" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="spinner" /> Sending Message...
                    </>
                  ) : (
                    <>
                      Send Message <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Contact Details Aside (Preserved exactly from original VELANTIS design) */}
          <aside className="contact-side">
            <h2>Get in Touch</h2>
            <p>Prefer a different way to reach us? Here are our direct contact channels.</p>

            <div className="contact-item">
              <Mail />
              <div>
                <b>Email</b>
                <a href="mailto:velantisdigital@gmail.com" style={{ color: 'inherit', textDecoration: 'none' }}>
                  <span>velantisdigital@gmail.com</span>
                </a>
                <small>We usually reply within 24 hours.</small>
              </div>
            </div>

            <div className="contact-item">
              <Phone />
              <div>
                <b>Call / WhatsApp</b>
                <span>+91 98765 43210</span>
                <small>Mon – Sat, 9:00 AM – 8:00 PM IST</small>
              </div>
            </div>

            <hr />

            <h3>Follow Us</h3>
            <p>Stay connected for product updates, technology articles, and new work.</p>
            <div className="socials">
              <a href="https://www.instagram.com/velantisdigitalsolution?exln=MWMyNGl3Mjl1ZWtqNQ==" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                </svg>
              </a>
              <a href="https://linkedin.com/company/velantis" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <Code2 />
              </a>
              <a href="https://github.com/velantisdigital" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                <Code2 />
              </a>
              <a href="mailto:velantisdigital@gmail.com" aria-label="Email">
                <Mail />
              </a>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
