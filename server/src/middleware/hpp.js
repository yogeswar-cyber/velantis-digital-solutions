/**
 * HTTP Parameter Pollution (HPP) protection middleware.
 * Prevents attackers from sending duplicate query parameters (e.g. ?status=NEW&status=CANCELLED)
 * which converts string fields into arrays, bypassing type checks or crashing endpoints.
 */
export function preventParameterPollution(whitelist = []) {
  const allowedMultiParams = new Set(whitelist);

  return (req, res, next) => {
    if (req.query && typeof req.query === 'object') {
      for (const [key, value] of Object.entries(req.query)) {
        if (Array.isArray(value) && !allowedMultiParams.has(key)) {
          // Keep only the last provided parameter value to prevent array injection
          req.query[key] = value[value.length - 1];
        }
      }
    }
    next();
  };
}
