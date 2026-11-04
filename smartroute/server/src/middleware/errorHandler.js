export function errorHandler(err, req, res, next) {
  // Ensure consistent error format
  const status = err.status || err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Internal server error';
  const details = err.details || undefined;
  const body = { error: { code, message } };
  if (details) body.error.details = details;
  // Don't leak stack in prod by default; keep simple for Phase 1
  res.status(status).json(body);
}
