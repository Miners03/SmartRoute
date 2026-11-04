import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
  }
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = { id: decoded.sub, role: decoded.role, email: decoded.email };
    next();
  } catch (e) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
  }
}
