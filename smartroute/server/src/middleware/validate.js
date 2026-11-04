import { z } from 'zod';

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({ body: req.body, query: req.query, params: req.params });
    if (!result.success) {
      const details = result.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details } });
    }
    req.validated = result.data;
    next();
  };
}
