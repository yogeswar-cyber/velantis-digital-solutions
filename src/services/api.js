/**
 * Centralized API client for VELANTIS DIGITAL SOLUTIONS.
 * Handles request execution, error parsing, credentials, and standardized responses.
 */

const API_BASE = '/api';

class ApiError extends Error {
  constructor(message, code = 'API_ERROR', status = 500, details = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // If body is FormData (e.g. file uploads), remove Content-Type so browser sets boundary automatically
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const config = {
    ...options,
    headers,
    credentials: options.credentials || 'include', // Send cookies for authenticated sessions
  };

  try {
    const res = await fetch(url, config);
    let json;

    try {
      json = await res.json();
    } catch {
      json = null;
    }

    if (!res.ok) {
      const errorMessage = json?.error?.message || `Request failed with status ${res.status}`;
      const errorCode = json?.error?.code || 'HTTP_ERROR';
      const details = json?.error?.details || null;
      throw new ApiError(errorMessage, errorCode, res.status, details);
    }

    return json?.data !== undefined ? json.data : json;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || 'Network error occurred. Please check your connection.', 'NETWORK_ERROR', 0);
  }
}

export const api = {
  // Health
  getHealth: () => request('/health'),

  // Services & Features
  getServices: () => request('/services'),
  getService: (idOrSlug) => request(`/services/${idOrSlug}`),
  getServiceFeatures: (idOrSlug) => request(`/services/${idOrSlug}/features`),

  // Projects (to be connected in Phase 5)
  createProject: (projectData) => request('/projects', { method: 'POST', body: JSON.stringify(projectData) }),
  getProject: (referenceNumber) => request(`/projects/${referenceNumber}`),

  // Contact (to be connected in Phase 6)
  sendContactMessage: (contactData) => request('/contact', { method: 'POST', body: JSON.stringify(contactData) }),

  // File Uploads (to be connected in Phase 7)
  uploadProjectFiles: (projectId, formData) => request(`/projects/${projectId}/files`, { method: 'POST', body: formData }),

  // Authentication (Phase 8)
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getCurrentUser: () => request('/auth/me'),
  changePassword: (passwordData) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(passwordData) }),

  // Admin (to be connected in Phase 9)
  getAdminProjects: (params = '') => request(`/admin/projects${params ? `?${params}` : ''}`),
  getAdminProjectById: (id) => request(`/admin/projects/${id}`),
  updateProjectStatus: (id, updateData) => request(`/admin/projects/${id}`, { method: 'PATCH', body: JSON.stringify(updateData) }),
  getAdminMessages: (params = '') => request(`/admin/messages${params ? `?${params}` : ''}`),
  getAdminAuditLogs: (params = '') => request(`/admin/audit-logs${params ? `?${params}` : ''}`),
};

export default api;
