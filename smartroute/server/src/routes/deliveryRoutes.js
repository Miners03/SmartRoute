import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { query } from '../db/pool.js';

const router = express.Router();

router.patch('/:id', authMiddleware, requireRole('manager'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    // ensure ownership via batch
    const own = await query(
      `SELECT d.id FROM deliveries d JOIN batches b ON b.id = d.batch_id WHERE d.id = $1 AND b.manager_id = $2`,
      [id, req.user.id]
    );
    if (own.rowCount === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Delivery not found' } });
    }
    const { lat, lng, geocode_status, customer_name, phone, raw_address, service_time_sec, status } = req.body || {};
    const sets = [];
    const params = [];
    let idx = 1;
    if (lat !== undefined) { sets.push(`lat = $${idx++}`); params.push(lat); }
    if (lng !== undefined) { sets.push(`lng = $${idx++}`); params.push(lng); }
    if (lat !== undefined && lng !== undefined && geocode_status === undefined) {
      sets.push(`geocode_status = $${idx++}`); params.push('manual');
    }
    if (geocode_status !== undefined) { sets.push(`geocode_status = $${idx++}`); params.push(geocode_status); }
    if (customer_name !== undefined) { sets.push(`customer_name = $${idx++}`); params.push(customer_name); }
    if (phone !== undefined) { sets.push(`phone = $${idx++}`); params.push(phone); }
    if (raw_address !== undefined) { sets.push(`raw_address = $${idx++}`); params.push(raw_address); }
    if (service_time_sec !== undefined) { sets.push(`service_time_sec = $${idx++}`); params.push(Number(service_time_sec)); }
    if (status !== undefined) { sets.push(`status = $${idx++}`); params.push(status); }
    if (sets.length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No fields to update' } });
    }
    params.push(id);
    const result = await query(`UPDATE deliveries SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    res.json({ delivery: result.rows[0] });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/cancel', authMiddleware, requireRole('manager'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const own = await query(
      `SELECT d.id FROM deliveries d JOIN batches b ON b.id = d.batch_id WHERE d.id = $1 AND b.manager_id = $2`,
      [id, req.user.id]
    );
    if (own.rowCount === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Delivery not found' } });
    }
    const result = await query(`UPDATE deliveries SET status = 'cancelled' WHERE id = $1 RETURNING *`, [id]);
    res.json({ delivery: result.rows[0] });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/geocode', authMiddleware, requireRole('manager'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const own = await query(
      `SELECT d.id, d.raw_address FROM deliveries d JOIN batches b ON b.id = d.batch_id WHERE d.id = $1 AND b.manager_id = $2`,
      [id, req.user.id]
    );
    if (own.rowCount === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Delivery not found' } });
    }
    const addr = own.rows[0].raw_address;
    // Use geocode service (simple)
    const { geocode } = await import('../services/geocodeService.js');
    const resGeo = await geocode(addr);
    if (!resGeo.ok) {
      await query(`UPDATE deliveries SET geocode_status = $1 WHERE id = $2`, ['not_found', id]);
      const dres = await query('SELECT * FROM deliveries WHERE id = $1', [id]);
      return res.json({ delivery: dres.rows[0], result: resGeo });
    }
    await query(`UPDATE deliveries SET lat = $1, lng = $2, geocode_status = 'ok' WHERE id = $3`, [resGeo.lat, resGeo.lng, id]);
    const dres = await query('SELECT * FROM deliveries WHERE id = $1', [id]);
    res.json({ delivery: dres.rows[0], result: resGeo });
  } catch (e) {
    next(e);
  }
});

export default router;
