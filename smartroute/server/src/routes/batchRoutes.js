import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { query } from '../db/pool.js';

const router = express.Router();

router.post('/', authMiddleware, requireRole('manager'), async (req, res, next) => {
  try {
    const { name, depot_id, delivery_date, objective = 'distance', return_to_depot = true } = req.body || {};
    if (!name || !depot_id || !delivery_date) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
    }
    const result = await query(
      `INSERT INTO batches (manager_id, depot_id, name, delivery_date, objective, return_to_depot, status)
       VALUES ($1,$2,$3,$4,$5,$6,'draft') RETURNING *`,
      [req.user.id, depot_id, name, delivery_date, objective, return_to_depot]
    );
    res.status(201).json({ batch: result.rows[0] });
  } catch (e) {
    next(e);
  }
});

router.get('/', authMiddleware, requireRole('manager'), async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM batches WHERE manager_id = $1 ORDER BY id DESC', [req.user.id]);
    res.json({ batches: result.rows });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', authMiddleware, requireRole('manager'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = await query('SELECT * FROM batches WHERE id = $1 AND manager_id = $2', [id, req.user.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Batch not found' } });
    }
    res.json({ batch: result.rows[0] });
  } catch (e) {
    next(e);
  }
});

export default router;
