import { query } from '../db/pool.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      // same generic message for missing/wrong
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
    }
    const emailLower = String(email).toLowerCase();
    const result = await query('SELECT id, email, password_hash, role, name FROM users WHERE email = $1', [emailLower]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
    }
    const token = jwt.sign({ sub: user.id, role: user.role, email: user.email }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
    return res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  } catch (e) {
    next(e);
  }
}

export async function me(req, res, next) {
  try {
    const result = await query('SELECT id, email, role, name FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
    }
    return res.json({ user });
  } catch (e) {
    next(e);
  }
}
