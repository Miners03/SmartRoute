import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { query } from '../db/pool.js';
import { getClient } from '../db/pool.js';

const router = express.Router();

// Create rider (manager only): creates users row + riders row in one transaction
router.post('/', authMiddleware, requireRole('manager'), async (req, res, next) => {
  try {
    const { name, email, password, vehicle_type, max_stops } = req.body || {};
    if (!name || !email || !password || !vehicle_type || max_stops === undefined) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
    }
    const emailLower = String(email).toLowerCase();
    const bcrypt = (await import('bcrypt')).default;
    const hash = await bcrypt.hash(String(password), 10);
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const ures = await client.query(
        `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,'rider') RETURNING id`,
        [name, emailLower, hash]
      );
      const userId = ures.rows[0].id;
      await client.query(
        `INSERT INTO riders (user_id, vehicle_type, max_stops, is_active) VALUES ($1,$2,$3,true)`,
        [userId, vehicle_type, Number(max_stops)]
      );
      await client.query('COMMIT');
      const rres = await client.query(
        `SELECT u.id as user_id, u.name, u.email, u.role, r.vehicle_type, r.max_stops, r.is_active
         FROM users u JOIN riders r ON r.user_id = u.id WHERE u.id = $1`,
        [userId]
      );
      res.status(201).json({ rider: rres.rows[0] });
    } catch (e) {
      await client.query('ROLLBACK');
      if (e.code === '23505') {
        return res.status(409).json({ error: { code: 'CONFLICT', message: 'Email already exists' } });
      }
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    next(e);
  }
});

router.get('/', authMiddleware, requireRole('manager'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id as user_id, u.name, u.email, u.role, r.vehicle_type, r.max_stops, r.is_active
       FROM users u JOIN riders r ON r.user_id = u.id ORDER BY u.id`
    );
    res.json({ riders: result.rows });
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', authMiddleware, requireRole('manager'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { vehicle_type, max_stops, is_active } = req.body || {};
    const sets = [];
    const params = [];
    let idx = 1;
    if (vehicle_type !== undefined) { sets.push(`vehicle_type = $${idx++}`); params.push(vehicle_type); }
    if (max_stops !== undefined) { sets.push(`max_stops = $${idx++}`); params.push(Number(max_stops)); }
    if (is_active !== undefined) { sets.push(`is_active = $${idx++}`); params.push(Boolean(is_active)); }
    if (sets.length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No fields to update' } });
    }
    params.push(id);
    const result = await query(`UPDATE riders SET ${sets.join(', ')} WHERE user_id = $${idx} RETURNING *`, params);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rider not found' } });
    }
    res.json({ rider: result.rows[0] });
  } catch (e) {
    next(e);
  }
});

export default router;
