import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { query, getClient } from '../db/pool.js';
import { parseCsv } from '../utils/csv.js';
import { geocode } from '../services/geocodeService.js';

const router = express.Router({ mergeParams: true });
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/import', authMiddleware, requireRole('manager'), upload.single('file'), async (req, res, next) => {
  try {
    const batchId = Number(req.params.id);
    const bres = await query('SELECT id FROM batches WHERE id = $1 AND manager_id = $2', [batchId, req.user.id]);
    if (bres.rowCount === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Batch not found' } });
    }
    if (!req.file) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' } });
    }
    if (!req.file.originalname.toLowerCase().endsWith('.csv')) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Only .csv files allowed' } });
    }
    const records = parseCsv(req.file.buffer);
    const report = { imported: 0, geocoded: 0, failed_geocode: 0, rejected: [] };
    const client = await getClient();
    try {
      await client.query('BEGIN');
      // get starting seq
      const sres = await client.query('SELECT COALESCE(MAX(original_seq),0) as maxs FROM deliveries WHERE batch_id = $1', [batchId]);
      let seq = Number(sres.rows[0].maxs);
      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const rowNum = i + 1;
        const customer_name = row.customer_name || row.Customer_Name || row.name;
        const phone = row.phone || row.Phone;
        const address = row.address || row.Address || row.raw_address;
        if (!customer_name || !phone || !address) {
          report.rejected.push({ row: rowNum, reason: 'Missing required fields' });
          continue;
        }
        seq += 1;
        let lat = row.lat !== undefined && row.lat !== '' ? Number(row.lat) : null;
        let lng = row.lng !== undefined && row.lng !== '' ? Number(row.lng) : null;
        let service_time_sec = row.service_time_sec !== undefined && row.service_time_sec !== '' ? Number(row.service_time_sec) : 120;
        let geocode_status = 'pending';
        if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
          geocode_status = 'ok'; // as per spec: rows with valid lat/lng skip geocoding
          report.geocoded += 1;
        }
        const dres = await client.query(
          `INSERT INTO deliveries (batch_id, customer_name, phone, raw_address, lat, lng, geocode_status, service_time_sec, status, original_seq)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9) RETURNING id`,
          [batchId, customer_name, phone, address, lat, lng, geocode_status, service_time_sec, seq]
        );
        report.imported += 1;
        const did = dres.rows[0].id;
        if (geocode_status !== 'ok') {
          // geocode sequentially
          try {
            const gres = await geocode(address);
            if (gres.ok) {
              await client.query(`UPDATE deliveries SET lat=$1,lng=$2,geocode_status='ok' WHERE id=$3`, [gres.lat, gres.lng, did]);
              report.geocoded += 1;
            } else {
              const st = gres.status === 'ambiguous' ? 'ambiguous' : 'not_found';
              await client.query(`UPDATE deliveries SET geocode_status=$1 WHERE id=$2`, [st, did]);
              report.failed_geocode += 1;
            }
          } catch (e) {
            await client.query(`UPDATE deliveries SET geocode_status='not_found' WHERE id=$1`, [did]);
            report.failed_geocode += 1;
          }
        }
      }
      await client.query('COMMIT');
      res.json(report);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    next(e);
  }
});

export default router;
