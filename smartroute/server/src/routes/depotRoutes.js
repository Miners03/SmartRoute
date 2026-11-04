import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { query } from '../db/pool.js';

const router = express.Router();

router.post('/', authMiddleware, requireRole('manager'), async (req, res, next) => {
  try {
    const { name, address, lat, lng } = req.body || {};
    if (!name || !address) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
    }
    const result = await query(
      `INSERT INTO depots (name, address, lat, lng) VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, address, lat ?? null, lng ?? null]
    );
    res.status(201).json({ depot: result.rows[0] });
  } catch (e) {
    next(e);
  }
});

router.get('/', authMiddleware, requireRole('manager'), async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM depots ORDER BY id');
    res.json({ depots: result.rows });
  } catch (e) {
    next(e);
  }
});

export default router;
