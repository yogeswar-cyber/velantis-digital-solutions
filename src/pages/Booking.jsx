import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Send,
  Search,
  Check,
  RotateCcw,
  Copy,
  AlertCircle,
  Loader2,
  Sparkles,
  Layers,
  FileText,
  Upload,
  X
} from 'lucide-react';
import api from '../services/api.js';

const BUDGET_OPTIONS = [
  'Under ₹10,000',
  '₹10,000 – ₹25,000',
  '₹25,000 – ₹50,000',
  '₹50,000+',
];

const TIMELINE_OPTIONS = [
  'Less than 1 week',
  '1 – 2 weeks',
  '2 – 4 weeks',
  '1 – 2 months',
  '2+ months',
  'Flexible',
];

const ALLOWED_EXTENSIONS = [
  '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.zip'
];

export default function Booking({ services: fallbackServices = [], ProcessSteps, PageHero, Button }) {
  const [step, setStep] = useState(1);
  const [availableServices, setAvailableServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [featureSearch, setFeatureSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const fileInputRef = useRef(null);

  // Form State
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    companyName: '',
    serviceId: '',
    budgetRange: '',
    timeline: '',
    description: '',
    selectedFeatureIds: [],
    customRequirements: '',
  });

  // Attached files state
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [fileError, setFileError] = useState(null);

  // UI States
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [submissionError, setSubmissionError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Fetch Services & Features from API on mount
  useEffect(() => {
    let mounted = true;
    api.getServices()
      .then((data) => {
        if (mounted && Array.isArray(data) && data.length > 0) {
          setAvailableServices(data);
          if (!formData.serviceId) {
            setFormData((prev) => ({ ...prev, serviceId: data[0].slug || data[0].id }));
          }
        }
      })
      .catch((err) => {
        console.warn('Using fallback services list due to API fetch error:', err.message);
        if (fallbackServices.length > 0) {
          const formatted = fallbackServices.map(([name, desc, Icon, features], idx) => ({
            id: `fallback-${idx}`,
            name,
            slug: name.toLowerCase().replace(/\s+/g, '-'),
            description: desc,
            features: features.map((f, fIdx) => ({
              id: `feat-${idx}-${fIdx}`,
              name: f,
              category: 'General',
            })),
          }));
          setAvailableServices(formatted);
          if (!formData.serviceId) {
            setFormData((prev) => ({ ...prev, serviceId: formatted[0].slug }));
          }
        }
      })
      .finally(() => {
        if (mounted) setLoadingServices(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const currentService = availableServices.find(
    (s) => s.id === formData.serviceId || s.slug === formData.serviceId
  ) || availableServices[0] || null;

  const serviceFeatures = currentService?.features || [];

  const filteredFeatures = serviceFeatures.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(featureSearch.toLowerCase()) ||
      (f.description && f.description.toLowerCase().includes(featureSearch.toLowerCase()));
    const matchesCategory = selectedCategory === 'ALL' || f.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['ALL', ...new Set(serviceFeatures.map((f) => f.category).filter(Boolean))];

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const toggleFeature = (featureId) => {
    setFormData((prev) => {
      const exists = prev.selectedFeatureIds.includes(featureId);
      return {
        ...prev,
        selectedFeatureIds: exists
          ? prev.selectedFeatureIds.filter((id) => id !== featureId)
          : [...prev.selectedFeatureIds, featureId],
      };
    });
  };

  const clearAllFeatures = () => {
    setFormData((prev) => ({ ...prev, selectedFeatureIds: [] }));
  };

  // File Handling
  const handleFileSelection = (newFiles) => {
    setFileError(null);
    const filesArray = Array.from(newFiles);

    if (attachedFiles.length + filesArray.length > 5) {
      setFileError('You can attach a maximum of 5 files in total.');
      return;
    }

    const validNewFiles = [];
    for (const file of filesArray) {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setFileError(`File '${file.name}' has an unsupported format. Allowed: PDF, PNG, JPG, WEBP, DOC, DOCX, XLS, XLSX, ZIP.`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setFileError(`File '${file.name}' exceeds the 10 MB limit.`);
        return;
      }
      validNewFiles.push(file);
    }

    setAttachedFiles((prev) => [...prev, ...validNewFiles]);
  };

  const removeFile = (index) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Step 1 Validation
  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.clientName.trim() || formData.clientName.trim().length < 2) {
      newErrors.clientName = 'Please enter your name (minimum 2 characters)';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.clientEmail.trim() || !emailRegex.test(formData.clientEmail.trim())) {
      newErrors.clientEmail = 'Please provide a valid email address';
    }
    if (!formData.serviceId) {
      newErrors.serviceId = 'Please select a project type';
    }
    if (!formData.description.trim() || formData.description.trim().length < 10) {
      newErrors.description = 'Please describe your project goals (at least 10 characters)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextFromStep1 = (e) => {
    e.preventDefault();
    if (validateStep1()) {
      setStep(2);
      window.scrollTo({ top: 300, behavior: 'smooth' });
    }
  };

  // Handle final submission to API (Project + File Attachments)
  const handleSubmitProject = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmissionError(null);

    try {
      const payload = {
        clientName: formData.clientName.trim(),
        clientEmail: formData.clientEmail.trim().toLowerCase(),
        clientPhone: formData.clientPhone.trim(),
        companyName: formData.companyName.trim(),
        serviceId: formData.serviceId,
        budgetRange: formData.budgetRange,
        timeline: formData.timeline,
        description: formData.description.trim(),
        selectedFeatureIds: formData.selectedFeatureIds,
        customRequirements: formData.customRequirements.trim(),
      };

      // 1. Create project record
      const result = await api.createProject(payload);

      // 2. Upload attached files if any
      if (attachedFiles.length > 0) {
        const formDataFiles = new FormData();
        for (const file of attachedFiles) {
          formDataFiles.append('files', file);
        }
        await api.uploadProjectFiles(result.id, formDataFiles);
      }

      setSubmissionResult({
        ...result,
        fileCount: attachedFiles.length,
      });
      setStep(4);
      window.scrollTo({ top: 300, behavior: 'smooth' });
    } catch (err) {
      console.error('Project submission error:', err);
      setSubmissionError(err.message || 'Unable to submit your project request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyReferenceToClipboard = () => {
    if (submissionResult?.referenceNumber) {
      navigator.clipboard.writeText(submissionResult.referenceNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <>
      <PageHero
        eyebrow="BOOK A PROJECT"
        title="Turn Your Idea Into a"
        accent="Project."
        desc="Tell us what you have in mind. Choose the services and features you need, and we'll prepare a clear plan, timeline, and quote."
      />

      <section className="section booking">
        <div className="container">
          {/* Stepper Progress Bar */}
          <div className="progress">
            <span className={step >= 1 ? 'current' : ''}>1</span>
            <i className={step > 1 ? 'active-line' : ''}></i>
            <span className={step >= 2 ? 'current' : ''}>2</span>
            <i className={step > 2 ? 'active-line' : ''}></i>
            <span className={step >= 3 ? 'current' : ''}>3</span>
            <i className={step > 3 ? 'active-line' : ''}></i>
            <span className={step >= 4 ? 'current' : ''}>4</span>
            <div>
              <b style={{ color: step >= 1 ? '#ff5a00' : 'inherit' }}>Project Details</b>
              <b style={{ color: step >= 2 ? '#ff5a00' : 'inherit' }}>Requirements</b>
              <b style={{ color: step >= 3 ? '#ff5a00' : 'inherit' }}>Review</b>
              <b style={{ color: step >= 4 ? '#ff5a00' : 'inherit' }}>Submitted</b>
            </div>
          </div>

          <div className="booking-grid">
            <div className="form-card">
              {/* Step Header */}
              <div className="form-heading">
                <span>{step}</span>
                <div>
                  <h2>
                    {step === 1 && 'Project Details'}
                    {step === 2 && 'Structured Requirements & Filters'}
                    {step === 3 && 'Review Your Request'}
                    {step === 4 && 'Request Received'}
                  </h2>
                  <p>
                    {step === 1 && 'Help us understand your business, timeline, and goals.'}
                    {step === 2 && 'Select the features you need or describe custom requirements.'}
                    {step === 3 && 'Double-check all entered information before submitting.'}
                    {step === 4 && 'Your project has been recorded in the VELANTIS pipeline.'}
                  </p>
                </div>
              </div>

              {/* STEP 1: PROJECT DETAILS */}
              {step === 1 && (
                <form onSubmit={handleNextFromStep1}>
                  <div className="form-row">
                    <label>
                      Your Name *
                      <input
                        type="text"
                        placeholder="Enter your name"
                        value={formData.clientName}
                        onChange={(e) => handleChange('clientName', e.target.value)}
                        className={errors.clientName ? 'input-error' : ''}
                      />
                      {errors.clientName && <span className="field-error">{errors.clientName}</span>}
                    </label>

                    <label>
                      Your Email *
                      <input
                        type="email"
                        placeholder="Enter your email"
                        value={formData.clientEmail}
                        onChange={(e) => handleChange('clientEmail', e.target.value)}
                        className={errors.clientEmail ? 'input-error' : ''}
                      />
                      {errors.clientEmail && <span className="field-error">{errors.clientEmail}</span>}
                    </label>
                  </div>

                  <div className="form-row">
                    <label>
                      Phone Number (Optional)
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={formData.clientPhone}
                        onChange={(e) => handleChange('clientPhone', e.target.value)}
                      />
                    </label>

                    <label>
                      Company / Organization (Optional)
                      <input
                        type="text"
                        placeholder="Your company or project name"
                        value={formData.companyName}
                        onChange={(e) => handleChange('companyName', e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="form-row">
                    <label>
                      Project Type *
                      <select
                        value={formData.serviceId}
                        onChange={(e) => {
                          handleChange('serviceId', e.target.value);
                          setFormData((prev) => ({ ...prev, selectedFeatureIds: [] }));
                        }}
                      >
                        {availableServices.map((svc) => (
                          <option key={svc.id || svc.slug} value={svc.slug || svc.id}>
                            {svc.name}
                          </option>
                        ))}
                      </select>
                      {errors.serviceId && <span className="field-error">{errors.serviceId}</span>}
                    </label>

                    <label>
                      Budget Range (Optional)
                      <select
                        value={formData.budgetRange}
                        onChange={(e) => handleChange('budgetRange', e.target.value)}
                      >
                        <option value="">Select a range</option>
                        {BUDGET_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="form-row">
                    <label>
                      Desired Timeline (Optional)
                      <select
                        value={formData.timeline}
                        onChange={(e) => handleChange('timeline', e.target.value)}
                      >
                        <option value="">Select expected timeline</option>
                        {TIMELINE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label>
                    Project Description *
                    <textarea
                      rows={4}
                      placeholder="Tell us about what you want to build, key goals, target audience, or reference links..."
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      className={errors.description ? 'input-error' : ''}
                    />
                    {errors.description && <span className="field-error">{errors.description}</span>}
                  </label>

                  {/* Interactive File Upload Area */}
                  <label>
                    Attach Reference Files (Optional)
                    <div
                      className="upload"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files) {
                          handleFileSelection(e.dataTransfer.files);
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <Upload />
                      <span>
                        Drag & drop files here, or <b>click to browse</b>
                        <small>Support for PDF, Images, Word, Excel, or ZIP (Max 10 MB each, up to 5 files)</small>
                      </span>
                    </div>

                    <input
                      type="file"
                      ref={fileInputRef}
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.zip"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files) {
                          handleFileSelection(e.target.files);
                        }
                      }}
                    />

                    {fileError && <span className="field-error" style={{ marginTop: '0.4rem' }}>{fileError}</span>}

                    {/* Attached files chips list */}
                    {attachedFiles.length > 0 && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {attachedFiles.map((file, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: '#fff7ed',
                              border: '1px solid #fed7aa',
                              padding: '0.4rem 0.8rem',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                              <FileText size={16} color="#ff5a00" flexShrink={0} />
                              <span style={{ fontWeight: 600, color: '#1f2937', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {file.name}
                              </span>
                              <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>({formatFileSize(file.size)})</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFile(idx);
                              }}
                              style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '2px' }}
                              title="Remove file"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </label>

                  <div style={{ marginTop: '1.5rem' }}>
                    <button type="submit" className="btn full">
                      Continue to Requirements <ArrowRight size={18} />
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: REQUIREMENTS & STRUCTURED FILTERS */}
              {step === 2 && (
                <div className="requirements-step">
                  <div className="service-banner" style={{ background: '#fff7ed', border: '1px solid #fed7aa', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#c2410c', textTransform: 'uppercase' }}>Selected Service</span>
                        <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.2rem', color: '#111827' }}>{currentService?.name}</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        style={{ background: 'none', border: 'none', color: '#ff5a00', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
                      >
                        Change Service
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="Search features..."
                        value={featureSearch}
                        onChange={(e) => setFeatureSearch(e.target.value)}
                        style={{ width: '100%', paddingLeft: '2.4rem' }}
                      />
                      <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 500 }}>
                        {formData.selectedFeatureIds.length} selected
                      </span>
                      {formData.selectedFeatureIds.length > 0 && (
                        <button
                          type="button"
                          onClick={clearAllFeatures}
                          style={{ background: '#f3f4f6', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {categories.length > 2 && (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '20px',
                            border: '1px solid',
                            borderColor: selectedCategory === cat ? '#ff5a00' : '#e5e7eb',
                            background: selectedCategory === cat ? '#fff7ed' : '#ffffff',
                            color: selectedCategory === cat ? '#ff5a00' : '#4b5563',
                            fontWeight: selectedCategory === cat ? 600 : 400,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}

                  <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '0.75rem', marginBottom: '1.5rem', background: '#fafafa' }}>
                    {filteredFeatures.length === 0 ? (
                      <p style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem 0', margin: 0 }}>
                        No features found matching "{featureSearch}".
                      </p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.6rem' }}>
                        {filteredFeatures.map((feat) => {
                          const isSelected = formData.selectedFeatureIds.includes(feat.id);
                          return (
                            <div
                              key={feat.id}
                              onClick={() => toggleFeature(feat.id)}
                              style={{
                                padding: '0.65rem 0.85rem',
                                borderRadius: '8px',
                                border: '1.5px solid',
                                borderColor: isSelected ? '#ff5a00' : '#e5e7eb',
                                background: '#ffffff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.6rem',
                                transition: 'all 0.15s ease',
                                boxShadow: isSelected ? '0 2px 8px rgba(255,90,0,0.12)' : 'none',
                              }}
                            >
                              <div
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '4px',
                                  border: '1.5px solid',
                                  borderColor: isSelected ? '#ff5a00' : '#d1d5db',
                                  background: isSelected ? '#ff5a00' : '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  marginTop: '2px',
                                }}
                              >
                                {isSelected && <Check size={13} color="#ffffff" strokeWidth={3} />}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: isSelected ? 600 : 500, color: '#1f2937' }}>
                                  {feat.name}
                                </div>
                                {feat.description && (
                                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
                                    {feat.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <label>
                    Custom Requirements or Specific Integrations
                    <textarea
                      rows={3}
                      placeholder="Don't see what you need? Describe any unique requirements, payment gateways, custom APIs, or special features..."
                      value={formData.customRequirements}
                      onChange={(e) => handleChange('customRequirements', e.target.value)}
                    />
                  </label>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ flex: 1 }}
                      onClick={() => setStep(1)}
                    >
                      <ArrowLeft size={18} /> Back
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{ flex: 2 }}
                      onClick={() => {
                        setStep(3);
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                    >
                      Review Request <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: REVIEW REAL DATA */}
              {step === 3 && (
                <div className="review-step">
                  {submissionError && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <AlertCircle size={20} flexShrink={0} />
                      <div style={{ fontSize: '0.9rem' }}>{submissionError}</div>
                    </div>
                  )}

                  {/* Client Info */}
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1rem', marginBottom: '1rem', background: '#fafafa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#111827' }}>Client Contact Details</strong>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        style={{ background: 'none', border: 'none', color: '#ff5a00', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                      >
                        Edit
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', fontSize: '0.85rem' }}>
                      <div><span style={{ color: '#6b7280' }}>Name:</span> <b>{formData.clientName}</b></div>
                      <div><span style={{ color: '#6b7280' }}>Email:</span> <b>{formData.clientEmail}</b></div>
                      {formData.clientPhone && <div><span style={{ color: '#6b7280' }}>Phone:</span> <b>{formData.clientPhone}</b></div>}
                      {formData.companyName && <div><span style={{ color: '#6b7280' }}>Company:</span> <b>{formData.companyName}</b></div>}
                    </div>
                  </div>

                  {/* Project Scope */}
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1rem', marginBottom: '1rem', background: '#fafafa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#111827' }}>Project Scope</strong>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        style={{ background: 'none', border: 'none', color: '#ff5a00', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                      >
                        Edit
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                      <div><span style={{ color: '#6b7280' }}>Service:</span> <b>{currentService?.name}</b></div>
                      <div><span style={{ color: '#6b7280' }}>Budget:</span> <b>{formData.budgetRange || 'Not specified'}</b></div>
                      <div><span style={{ color: '#6b7280' }}>Timeline:</span> <b>{formData.timeline || 'Not specified'}</b></div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '0.2rem' }}>Description:</span>
                      <p style={{ margin: 0, fontSize: '0.88rem', color: '#374151', whiteSpace: 'pre-wrap', background: '#ffffff', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                        {formData.description}
                      </p>
                    </div>
                  </div>

                  {/* Features */}
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1rem', marginBottom: '1rem', background: '#fafafa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#111827' }}>
                        Selected Features ({formData.selectedFeatureIds.length})
                      </strong>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        style={{ background: 'none', border: 'none', color: '#ff5a00', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                      >
                        Edit
                      </button>
                    </div>

                    {formData.selectedFeatureIds.length === 0 ? (
                      <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: '0.5rem 0' }}>
                        No predefined features selected.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                        {formData.selectedFeatureIds.map((id) => {
                          const feat = serviceFeatures.find((f) => f.id === id);
                          return (
                            <span
                              key={id}
                              style={{
                                background: '#fff7ed',
                                border: '1px solid #fed7aa',
                                color: '#c2410c',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '16px',
                                fontSize: '0.8rem',
                                fontWeight: 500,
                              }}
                            >
                              {feat ? feat.name : id}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {formData.customRequirements && (
                      <div style={{ marginTop: '0.6rem' }}>
                        <span style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '0.2rem' }}>
                          Custom Requirements:
                        </span>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#374151', fontStyle: 'italic', background: '#ffffff', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                          "{formData.customRequirements}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Attached Files Review */}
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem', background: '#fafafa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#111827' }}>
                        Attached Files ({attachedFiles.length})
                      </strong>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        style={{ background: 'none', border: 'none', color: '#ff5a00', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                      >
                        Edit
                      </button>
                    </div>

                    {attachedFiles.length === 0 ? (
                      <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: 0 }}>
                        No files attached.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {attachedFiles.map((f, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#374151' }}>
                            <FileText size={15} color="#ff5a00" />
                            <span>{f.name}</span>
                            <small style={{ color: '#9ca3af' }}>({formatFileSize(f.size)})</small>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Submit Actions */}
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ flex: 1 }}
                      onClick={() => setStep(2)}
                      disabled={submitting}
                    >
                      <ArrowLeft size={18} /> Back
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{ flex: 2 }}
                      onClick={handleSubmitProject}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={18} className="spinner" />
                          Submitting Project...
                        </>
                      ) : (
                        <>
                          Submit Project Request <Send size={18} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: SUBMITTED CONFIRMATION */}
              {step === 4 && (
                <div className="success" style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                    <CheckCircle2 size={36} color="#16a34a" />
                  </div>

                  <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem', color: '#111827' }}>
                    Project Request Received!
                  </h2>

                  <p style={{ color: '#4b5563', maxWidth: '440px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
                    Thank you, <strong>{submissionResult?.clientName || formData.clientName}</strong>. Your project request has been successfully submitted to the VELANTIS engineering team.
                  </p>

                  {/* Project Reference Card */}
                  {submissionResult?.referenceNumber && (
                    <div
                      style={{
                        background: '#fff7ed',
                        border: '1.5px dashed #ff5a00',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        maxWidth: '380px',
                        margin: '0 auto 1.75rem',
                      }}
                    >
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Your Authoritative Project Reference
                      </span>
                      <div
                        style={{
                          fontSize: '1.8rem',
                          fontWeight: 800,
                          color: '#ff5a00',
                          letterSpacing: '0.05em',
                          margin: '0.4rem 0',
                          fontFamily: 'monospace',
                        }}
                      >
                        {submissionResult.referenceNumber}
                      </div>

                      {submissionResult.fileCount > 0 && (
                        <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600, marginBottom: '0.5rem' }}>
                          ✓ {submissionResult.fileCount} reference file(s) attached securely
                        </div>
                      )}

                      <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0 0 0.75rem' }}>
                        Please save this reference number for all future communications.
                      </p>
                      <button
                        type="button"
                        onClick={copyReferenceToClipboard}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #fed7aa',
                          color: '#c2410c',
                          padding: '0.4rem 0.9rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        {copied ? (
                          <>
                            <Check size={14} color="#16a34a" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy size={14} /> Copy Reference
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Button to="/">Back to Home</Button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => {
                        setStep(1);
                        setSubmissionResult(null);
                        setAttachedFiles([]);
                        setFormData({
                          clientName: '',
                          clientEmail: '',
                          clientPhone: '',
                          companyName: '',
                          serviceId: availableServices[0]?.slug || '',
                          budgetRange: '',
                          timeline: '',
                          description: '',
                          selectedFeatureIds: [],
                          customRequirements: '',
                        });
                      }}
                    >
                      Submit Another Request
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Aside */}
            <aside>
              <div className="side-card orange">
                <CalendarDays />
                <h3>Book With Confidence</h3>
                <p>No commitment. Just an open conversation to understand your needs and craft the right solution.</p>
                <ul>
                  <li>Direct communication with engineers</li>
                  <li>Clear, honest scope and pricing</li>
                  <li>Transparent development milestones</li>
                  <li>Free initial technical consultation</li>
                </ul>
              </div>

              <div className="side-card">
                <h3>Our Core Services</h3>
                <p>Choose the digital solution that fits your business needs.</p>
                {(availableServices.length > 0 ? availableServices : fallbackServices)
                  .slice(0, 6)
                  .map((svc) => {
                    const name = svc.name || svc[0];
                    const desc = svc.description || svc[1] || '';
                    return (
                      <Link to="/services" key={name}>
                        <Layers size={18} />
                        <span>
                          <b>{name}</b>
                          <small>{desc.split('.')[0]}</small>
                        </span>
                        <ChevronRight size={16} />
                      </Link>
                    );
                  })}
              </div>
            </aside>
          </div>

          {/* Not Sure Yet Band */}
          <div className="not-sure">
            <div>
              <h3>Not Sure What You Need Yet?</h3>
              <p>You can also reach out to us directly or send a general inquiry through the contact page.</p>
            </div>
            <Button to="/contact" outline>
              Go to Contact Page
            </Button>
          </div>

          {/* Process Steps */}
          <div className="simple-steps">
            <span className="eyebrow">SIMPLE STEPS</span>
            <h2>How It Works</h2>
            <ProcessSteps />
          </div>
        </div>
      </section>
    </>
  );
}
