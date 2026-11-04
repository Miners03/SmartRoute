import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { query, getClient } from '../db/pool.js';

const router = express.Router({ mergeParams: true });

// POST /batches/:id/deliveries
router.post('/', authMiddleware, requireRole('manager'), async (req, res, next) => {
  try {
    const batchId = Number(req.params.id);
    // check ownership
    const bres = await query('SELECT id FROM batches WHERE id = $1 AND manager_id = $2', [batchId, req.user.id]);
    if (bres.rowCount === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Batch not found' } });
    }
    const { customer_name, phone, raw_address, lat, lng, service_time_sec = 120 } = req.body || {};
    if (!customer_name || !phone || !raw_address) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
    }
    // get next original_seq
    const sres = await query('SELECT COALESCE(MAX(original_seq),0)+1 as seq FROM deliveries WHERE batch_id = $1', [batchId]);
    const seq = sres.rows[0].seq;
    let geocode_status = 'pending';
    let llat = lat ?? null, llng = lng ?? null;
    if (lat !== undefined && lat !== null && lng !== undefined && lng !== null) {
      geocode_status = 'manual';
    }
    const result = await query(
      `INSERT INTO deliveries (batch_id, customer_name, phone, raw_address, lat, lng, geocode_status, service_time_sec, status, original_seq)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9) RETURNING *`,
      [batchId, customer_name, phone, raw_address, llat, llng, geocode_status, Number(service_time_sec), seq]
    );
    res.status(201).json({ delivery: result.rows[0] });
  } catch (e) {
    next(e);
  }
});

router.get('/', authMiddleware, requireRole('manager'), async (req, res, next) => {
  try {
    const batchId = Number(req.params.id);
    const bres = await query('SELECT id FROM batches WHERE id = $1 AND manager_id = $2', [batchId, req.user.id]);
    if (bres.rowCount === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Batch not found' } });
    }
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 50);
    const status = req.query.status;
    const offset = (page - 1) * limit;
    const params = [batchId];
    let where = 'WHERE batch_id = $1';
    if (status) {
      params.push(status);
      where += ` AND status = $${params.length}`;
    }
    params.push(limit);
    params.push(offset);
    const result = await query(`SELECT * FROM deliveries ${where} ORDER BY original_seq ASC LIMIT $${params.length-1} OFFSET $${params.length}`, params);
    const countRes = await query(`SELECT COUNT(*) FROM deliveries ${where.replace('LIMIT','')}`.replace(/LIMIT.*$/i,''), status ? [batchId, status] : [batchId]);
    res.json({ deliveries: result.rows, page, limit, total: Number(countRes.rows[0].count) });
  } catch (e) {
    next(e);
  }
});

export default router;
