import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FolderGit2,
  MessageSquare,
  ShieldAlert,
  LogOut,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Download,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  User,
  Lock,
  Loader2,
  Calendar,
  Building,
  Mail,
  Phone,
  Tag,
  ArrowUpRight
} from 'lucide-react';
import api from '../services/api.js';

const STATUS_COLORS = {
  NEW: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  REVIEWING: { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
  CONTACTED: { bg: '#e0e7ff', text: '#4338ca', border: '#c7d2fe' },
  QUOTED: { bg: '#ede9fe', text: '#6d28d9', border: '#ddd6fe' },
  APPROVED: { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
  IN_PROGRESS: { bg: '#fef9c3', text: '#854d0e', border: '#fef08a' },
  COMPLETED: { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' },
  CANCELLED: { bg: '#f3f4f6', text: '#4b5563', border: '#e5e7eb' },
};

const ALL_STATUSES = [
  'NEW',
  'REVIEWING',
  'CONTACTED',
  'QUOTED',
  'APPROVED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
];

export default function Admin() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  // Active Tab: 'overview' | 'projects' | 'messages' | 'audit'
  const [activeTab, setActiveTab] = useState('overview');

  // Dashboard Data
  const [metrics, setMetrics] = useState(null);
  const [projectsData, setProjectsData] = useState({ projects: [], pagination: {} });
  const [messagesData, setMessagesData] = useState({ messages: [], pagination: {} });
  const [auditData, setAuditData] = useState({ logs: [], pagination: {} });

  // Filters & Search
  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState('ALL');
  const [messageStatusFilter, setMessageStatusFilter] = useState('ALL');
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');

  // Selected Project for Detail Drawer/Modal
  const [selectedProject, setSelectedProject] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Status Change Form State
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState(null);

  // Check auth session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    setAuthChecking(true);
    try {
      const user = await api.getCurrentUser();
      setCurrentUser(user);
    } catch {
      setCurrentUser(null);
    } finally {
      setAuthChecking(false);
    }
  };

  // Load data for active tab
  useEffect(() => {
    if (!currentUser) return;

    if (activeTab === 'overview') {
      loadMetrics();
    } else if (activeTab === 'projects') {
      loadProjects();
    } else if (activeTab === 'messages') {
      loadMessages();
    } else if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [currentUser, activeTab, projectStatusFilter, messageStatusFilter, auditActionFilter]);

  const loadMetrics = async () => {
    try {
      const res = await api.getAdminMetrics();
      setMetrics(res);
    } catch (err) {
      console.error('Failed to load metrics:', err);
    }
  };

  const loadProjects = async (search = projectSearch) => {
    try {
      const params = new URLSearchParams();
      if (projectStatusFilter !== 'ALL') params.append('status', projectStatusFilter);
      if (search.trim()) params.append('search', search.trim());
      const res = await api.getAdminProjects(params.toString());
      setProjectsData(res);
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  const loadMessages = async () => {
    try {
      const params = new URLSearchParams();
      if (messageStatusFilter !== 'ALL') params.append('status', messageStatusFilter);
      const res = await api.getAdminMessages(params.toString());
      setMessagesData(res);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (auditActionFilter !== 'ALL') params.append('action', auditActionFilter);
      const res = await api.getAdminAuditLogs(params.toString());
      setAuditData(res);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const user = await api.login({ email: loginEmail, password: loginPassword });
      setCurrentUser(user);
      setLoginPassword('');
    } catch (err) {
      setLoginError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error(err);
    } finally {
      setCurrentUser(null);
      setSelectedProject(null);
    }
  };

  const openProjectDetail = async (projectId) => {
    setLoadingDetail(true);
    setActionSuccessMessage(null);
    try {
      const project = await api.getAdminProjectById(projectId);
      setSelectedProject(project);
      setNewStatus(project.status);
      setInternalNotes(project.internalNotes || '');
      setStatusNotes('');
    } catch (err) {
      alert(`Could not open project: ${err.message}`);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedProject || updatingStatus) return;
    setUpdatingStatus(true);
    setActionSuccessMessage(null);
    try {
      const updated = await api.updateProjectStatus(selectedProject.id, {
        status: newStatus,
        statusNotes: statusNotes.trim() || undefined,
      });
      setSelectedProject(updated);
      setActionSuccessMessage(`Status updated to ${newStatus}`);
      setStatusNotes('');
      // Refresh list in background
      loadProjects();
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveInternalNotes = async () => {
    if (!selectedProject || savingNotes) return;
    setSavingNotes(true);
    setActionSuccessMessage(null);
    try {
      const updated = await api.updateProjectStatus(selectedProject.id, {
        internalNotes: internalNotes,
      });
      setSelectedProject(updated);
      setActionSuccessMessage('Internal notes saved successfully');
      loadProjects();
    } catch (err) {
      alert(`Failed to save notes: ${err.message}`);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleUpdateMessageStatus = async (messageId, status) => {
    try {
      await api.updateMessageStatus(messageId, { status });
      loadMessages();
    } catch (err) {
      alert(`Failed to update message: ${err.message}`);
    }
  };

  if (authChecking) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} className="spinner" color="#ff5a00" />
      </div>
    );
  }

  // If not logged in, render the Admin Login screen
  if (!currentUser) {
    return (
      <div style={{ minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div style={{ width: '100%', maxWidth: '420px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '2.5rem', boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{ color: '#ff5a00', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase' }}>
              INTERNAL PORTAL
            </span>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.4rem 0 0.5rem', color: '#111827' }}>
              VELANTIS Admin
            </h1>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
              Sign in with your staff or administrator account
            </p>
          </div>

          {loginError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.8rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} flexShrink={0} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="admin@velantis.in"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem' }}
              />
            </div>

            <button
              type="submit"
              className="btn full"
              disabled={loginLoading}
              style={{ justifyContent: 'center', padding: '0.85rem', fontSize: '0.95rem' }}
            >
              {loginLoading ? (
                <>
                  <Loader2 size={16} className="spinner" /> Authenticating...
                </>
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Authenticated Admin Dashboard
  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', paddingBottom: '4rem' }}>
      {/* Admin Top Bar */}
      <div style={{ background: '#111827', color: '#fff', borderBottom: '1px solid #1f2937' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ background: '#ff5a00', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px' }}>
              VELANTIS
            </span>
            <span style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.3px' }}>Operations Portal</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ fontSize: '0.85rem', textAlign: 'right' }}>
              <div style={{ fontWeight: 600 }}>{currentUser.name}</div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{currentUser.role}</div>
            </div>
            <button
              onClick={handleLogout}
              style={{ background: '#1f2937', border: '1px solid #374151', color: '#e5e7eb', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div className="container" style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto' }}>
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'projects', label: 'Projects & Pipeline', icon: FolderGit2, badge: metrics?.totals?.newProjects },
            { id: 'messages', label: 'Client Inquiries', icon: MessageSquare, badge: metrics?.totals?.newMessages },
            { id: 'audit', label: 'Security & Audit Logs', icon: ShieldAlert },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: active ? '3px solid #ff5a00' : '3px solid transparent',
                  padding: '1rem 0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: active ? '#ff5a00' : '#4b5563',
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
                {Boolean(tab.badge) && (
                  <span style={{ background: '#ff5a00', color: '#fff', fontSize: '0.7rem', padding: '0.1rem 0.45rem', borderRadius: '10px', fontWeight: 700 }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container" style={{ marginTop: '2rem' }}>
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && metrics && (
          <div>
            {/* Stat Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {[
                { title: 'Total Projects', value: metrics.totals.projects, color: '#111827' },
                { title: 'New Requests', value: metrics.totals.newProjects, color: '#d97706', highlight: true },
                { title: 'In Progress / Approved', value: metrics.totals.inProgressProjects, color: '#2563eb' },
                { title: 'Completed', value: metrics.totals.completedProjects, color: '#16a34a' },
                { title: 'New Inquiries', value: metrics.totals.newMessages, color: '#9333ea' },
              ].map((card, i) => (
                <div
                  key={i}
                  style={{
                    background: '#fff',
                    border: card.highlight ? '1.5px solid #f59e0b' : '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600 }}>{card.title}</span>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: card.color, marginTop: '0.3rem' }}>
                    {card.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Activity Split */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
              {/* Recent Projects */}
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Recent Project Requests</h3>
                  <button
                    onClick={() => setActiveTab('projects')}
                    style={{ background: 'none', border: 'none', color: '#ff5a00', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    View All →
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {metrics.recentProjects.map((p) => {
                    const st = STATUS_COLORS[p.status] || STATUS_COLORS.NEW;
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setActiveTab('projects');
                          openProjectDetail(p.id);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: '1px solid #f3f4f6',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#ff5a00', fontSize: '0.85rem' }}>
                              {p.referenceNumber}
                            </span>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1f2937' }}>{p.clientName}</span>
                          </div>
                          <small style={{ color: '#6b7280' }}>{p.service?.name}</small>
                        </div>
                        <span
                          style={{
                            background: st.bg,
                            color: st.text,
                            border: `1px solid ${st.border}`,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          {p.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Inquiries */}
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Recent Contact Inquiries</h3>
                  <button
                    onClick={() => setActiveTab('messages')}
                    style={{ background: 'none', border: 'none', color: '#ff5a00', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    View All →
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {metrics.recentMessages.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setActiveTab('messages')}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #f3f4f6',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{m.status}</span>
                      </div>
                      <small style={{ color: '#6b7280', display: 'block', marginTop: '2px' }}>{m.subject}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PROJECTS TAB */}
        {activeTab === 'projects' && (
          <div>
            {/* Filter & Search Bar */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.8rem', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '260px' }}>
                <input
                  type="text"
                  placeholder="Search by reference, client, email..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadProjects(projectSearch)}
                  style={{ flex: 1, padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.88rem' }}
                />
                <button
                  type="button"
                  onClick={() => loadProjects(projectSearch)}
                  style={{ background: '#ff5a00', color: '#fff', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}
                >
                  <Search size={16} />
                </button>
              </div>

              {/* Status Filter Pills */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {['ALL', ...ALL_STATUSES].map((st) => (
                  <button
                    key={st}
                    onClick={() => setProjectStatusFilter(st)}
                    style={{
                      padding: '0.35rem 0.65rem',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: projectStatusFilter === st ? '#ff5a00' : '#e5e7eb',
                      background: projectStatusFilter === st ? '#fff7ed' : '#ffffff',
                      color: projectStatusFilter === st ? '#ff5a00' : '#4b5563',
                      fontSize: '0.75rem',
                      fontWeight: projectStatusFilter === st ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Projects Table */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Reference</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Client</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Service</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Submitted</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projectsData.projects.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                        No projects found matching the current filters.
                      </td>
                    </tr>
                  ) : (
                    projectsData.projects.map((p) => {
                      const st = STATUS_COLORS[p.status] || STATUS_COLORS.NEW;
                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#ff5a00' }}>
                            {p.referenceNumber}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ fontWeight: 600, color: '#111827' }}>{p.clientName}</div>
                            <small style={{ color: '#6b7280' }}>{p.clientEmail}</small>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: '#374151' }}>
                            {p.service?.name}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span
                              style={{
                                background: st.bg,
                                color: st.text,
                                border: `1px solid ${st.border}`,
                                padding: '0.2rem 0.55rem',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: '#6b7280', fontSize: '0.8rem' }}>
                            {new Date(p.createdAt).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            <button
                              onClick={() => openProjectDetail(p.id)}
                              style={{
                                background: '#f3f4f6',
                                border: '1px solid #e5e7eb',
                                color: '#1f2937',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MESSAGES TAB */}
        {activeTab === 'messages' && (
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              {['ALL', 'NEW', 'READ', 'RESPONDED', 'ARCHIVED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setMessageStatusFilter(st)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: messageStatusFilter === st ? '#ff5a00' : '#e5e7eb',
                    background: messageStatusFilter === st ? '#fff7ed' : '#ffffff',
                    color: messageStatusFilter === st ? '#ff5a00' : '#4b5563',
                    fontSize: '0.8rem',
                    fontWeight: messageStatusFilter === st ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {st}
                </button>
              ))}
            </div>

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Sender</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Subject & Message</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Received</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Triage</th>
                  </tr>
                </thead>
                <tbody>
                  {messagesData.messages.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                        No contact inquiries found.
                      </td>
                    </tr>
                  ) : (
                    messagesData.messages.map((m) => (
                      <tr key={m.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{m.name}</div>
                          <small style={{ color: '#6b7280' }}>{m.email}</small>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', maxWidth: '400px' }}>
                          <div style={{ fontWeight: 600, color: '#1f2937' }}>{m.subject}</div>
                          <p style={{ margin: '0.2rem 0 0', color: '#4b5563', fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>
                            {m.message}
                          </p>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '6px', background: m.status === 'NEW' ? '#fef3c7' : '#f3f4f6', color: m.status === 'NEW' ? '#92400e' : '#4b5563' }}>
                            {m.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#6b7280', fontSize: '0.8rem' }}>
                          {new Date(m.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.3rem' }}>
                            {m.status === 'NEW' && (
                              <button
                                onClick={() => handleUpdateMessageStatus(m.id, 'READ')}
                                style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
                              >
                                Read
                              </button>
                            )}
                            {m.status !== 'RESPONDED' && (
                              <button
                                onClick={() => handleUpdateMessageStatus(m.id, 'RESPONDED')}
                                style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#16a34a', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                              >
                                Responded
                              </button>
                            )}
                            {m.status !== 'ARCHIVED' && (
                              <button
                                onClick={() => handleUpdateMessageStatus(m.id, 'ARCHIVED')}
                                style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#6b7280', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
                              >
                                Archive
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AUDIT LOGS TAB */}
        {activeTab === 'audit' && (
          <div>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4b5563' }}>Filter Action:</span>
              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
              >
                <option value="ALL">All Actions</option>
                <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
                <option value="LOGIN_FAILED">LOGIN_FAILED</option>
                <option value="PROJECT_CREATED">PROJECT_CREATED</option>
                <option value="PROJECT_STATUS_UPDATED">PROJECT_STATUS_UPDATED</option>
                <option value="PROJECT_NOTES_UPDATED">PROJECT_NOTES_UPDATED</option>
                <option value="FILE_UPLOADED">FILE_UPLOADED</option>
                <option value="FILE_DOWNLOADED">FILE_DOWNLOADED</option>
                <option value="CONTACT_MESSAGE_RECEIVED">CONTACT_MESSAGE_RECEIVED</option>
              </select>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Timestamp</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Action</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Resource</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Actor</th>
                    <th style={{ padding: '0.75rem 1rem' }}>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {auditData.logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                        No audit events found.
                      </td>
                    </tr>
                  ) : (
                    auditData.logs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '0.75rem 1rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                          <span style={{ background: '#f3f4f6', padding: '0.2rem 0.5rem', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#4b5563' }}>
                          {log.resourceType} {log.resourceId ? `(${log.resourceId.slice(0, 8)}...)` : ''}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          {log.user ? `${log.user.name} (${log.user.email})` : 'System / Client'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#9ca3af', fontFamily: 'monospace' }}>
                          {log.ipAddress || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* PROJECT DETAIL MODAL / DRAWER */}
      {selectedProject && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 100,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setSelectedProject(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '680px',
              height: '100%',
              background: '#fff',
              overflowY: 'auto',
              padding: '2rem',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#ff5a00', fontSize: '1.2rem' }}>
                  {selectedProject.referenceNumber}
                </span>
                <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.4rem', color: '#111827' }}>
                  {selectedProject.clientName}
                </h2>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            {actionSuccessMessage && (
              <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#16a34a', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                ✓ {actionSuccessMessage}
              </div>
            )}

            {/* Client Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: '#fafafa', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              <div><span style={{ color: '#6b7280' }}>Email:</span> <b>{selectedProject.clientEmail}</b></div>
              <div><span style={{ color: '#6b7280' }}>Phone:</span> <b>{selectedProject.clientPhone || '—'}</b></div>
              <div><span style={{ color: '#6b7280' }}>Company:</span> <b>{selectedProject.companyName || '—'}</b></div>
              <div><span style={{ color: '#6b7280' }}>Service:</span> <b>{selectedProject.service?.name}</b></div>
              <div><span style={{ color: '#6b7280' }}>Budget:</span> <b>{selectedProject.budgetRange || '—'}</b></div>
              <div><span style={{ color: '#6b7280' }}>Timeline:</span> <b>{selectedProject.timeline || '—'}</b></div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Description</span>
              <p style={{ margin: '0.4rem 0 0', background: '#f9fafb', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.88rem', color: '#374151', whiteSpace: 'pre-wrap' }}>
                {selectedProject.description}
              </p>
            </div>

            {/* Structured Features */}
            {selectedProject.features?.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Requested Features ({selectedProject.features.length})
                </span>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {selectedProject.features.map((pf) => (
                    <span
                      key={pf.id}
                      style={{
                        background: '#fff7ed',
                        border: '1px solid #fed7aa',
                        color: '#c2410c',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '16px',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                      }}
                    >
                      {pf.feature?.name || pf.customFeatureName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Attached Files */}
            {selectedProject.files?.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Attached Files ({selectedProject.files.length})
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                  {selectedProject.files.map((file) => (
                    <div
                      key={file.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.6rem 0.8rem',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        background: '#fff',
                        fontSize: '0.85rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={16} color="#ff5a00" />
                        <span style={{ fontWeight: 600 }}>{file.originalFilename}</span>
                        <small style={{ color: '#6b7280' }}>({(file.size / 1024).toFixed(0)} KB)</small>
                      </div>
                      <a
                        href={`/api/projects/${selectedProject.id}/files/${file.id}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: '#f3f4f6',
                          border: '1px solid #e5e7eb',
                          color: '#1f2937',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        <Download size={13} /> Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <hr style={{ border: '0', borderTop: '1px solid #e5e7eb', margin: '1.5rem 0' }} />

            {/* Status Manager */}
            <div style={{ marginBottom: '1.5rem', background: '#fffaf7', border: '1px solid #fed7aa', padding: '1.25rem', borderRadius: '10px' }}>
              <h4 style={{ margin: '0 0 0.8rem', fontSize: '0.95rem', color: '#9a3412' }}>Status Pipeline & Transition</h4>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.88rem' }}
                >
                  {ALL_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn"
                  onClick={handleUpdateStatus}
                  disabled={updatingStatus || newStatus === selectedProject.status}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                  {updatingStatus ? 'Updating...' : 'Update Status'}
                </button>
              </div>
              <input
                type="text"
                placeholder="Reason or notes for this status change (optional)..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.82rem' }}
              />
            </div>

            {/* Internal Staff Notes */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Private Internal Staff Notes
                </span>
                <small style={{ color: '#ef4444' }}>Never visible to clients</small>
              </div>
              <textarea
                rows={4}
                placeholder="Private technical notes, team assignments, milestones, pricing details..."
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.88rem' }}
              />
              <button
                type="button"
                onClick={handleSaveInternalNotes}
                disabled={savingNotes}
                style={{
                  marginTop: '0.5rem',
                  background: '#111827',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {savingNotes ? 'Saving Notes...' : 'Save Internal Notes'}
              </button>
            </div>

            {/* Status History Timeline */}
            {selectedProject.statusHistory?.length > 0 && (
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Status History Trail
                </span>
                <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedProject.statusHistory.map((h) => (
                    <div
                      key={h.id}
                      style={{
                        padding: '0.6rem 0.8rem',
                        background: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <b>
                          {h.oldStatus} → {h.newStatus}
                        </b>
                        <span style={{ color: '#9ca3af' }}>{new Date(h.createdAt).toLocaleString()}</span>
                      </div>
                      {h.notes && <div style={{ color: '#4b5563', marginTop: '2px' }}>{h.notes}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
