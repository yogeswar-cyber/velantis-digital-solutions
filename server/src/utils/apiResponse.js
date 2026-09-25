/**
 * Standardized API response format conforming to VELANTIS specification (Section 92).
 */
export function sendSuccess(res, data = {}, statusCode = 200, meta = null) {
  const response = {
    success: true,
    data,
  };
  if (meta) {
    response.meta = meta;
  }
  return res.status(statusCode).json(response);
}

export function sendError(res, message = 'Unable to process your request.', code = 'INTERNAL_ERROR', statusCode = 500, details = null) {
  const response = {
    success: false,
    error: {
      code,
      message,
    },
  };
  if (details && process.env.NODE_ENV !== 'production') {
    response.error.details = details;
  }
  return res.status(statusCode).json(response);
}
