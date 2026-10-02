/**
 * Strips dangerous HTML script tags, event handlers, and javascript: URIs
 * to prevent stored and reflected Cross-Site Scripting (XSS).
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;

  return str
    // Strip <script>...</script> tags and contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Strip standalone HTML tags like <img onerror=...>, <iframe ...>, etc.
    .replace(/<[^>]+>/g, '')
    // Strip javascript: pseudo-protocol
    .replace(/javascript\s*:/gi, '')
    // Strip dangerous on* attributes like onclick, onerror, onload
    .replace(/\bon\w+\s*=/gi, '')
    .trim();
}

/**
 * Recursively sanitizes all string fields within an object or array.
 */
function sanitizeDeep(obj) {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeDeep);
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeDeep(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Middleware that automatically sanitizes req.body, req.query, and req.params.
 */
export function sanitizeInputs(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeDeep(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeDeep(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeDeep(req.params);
  }
  next();
}
