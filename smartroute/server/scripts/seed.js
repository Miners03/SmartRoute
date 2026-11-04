import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import { pool } from '../src/db/pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function run() {
  try {
    const managerEmail = process.env.SEED_MANAGER_EMAIL.toLowerCase();
    const riderEmail = process.env.SEED_RIDER_EMAIL.toLowerCase();
    const managerPass = process.env.SEED_MANAGER_PASSWORD;
    const riderPass = process.env.SEED_RIDER_PASSWORD;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // manager
      const mhash = await bcrypt.hash(managerPass, 10);
      const mres = await client.query(
        `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,'manager')
         ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
        [process.env.SEED_MANAGER_NAME, managerEmail, mhash]
      );
      const managerId = mres.rows[0].id;

      // rider
      const rhash = await bcrypt.hash(riderPass, 10);
      const rres = await client.query(
        `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,'rider')
         ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
        [process.env.SEED_RIDER_NAME, riderEmail, rhash]
      );
      const riderId = rres.rows[0].id;

      await client.query(
        `INSERT INTO riders (user_id, vehicle_type, max_stops, is_active)
         VALUES ($1,$2,$3,true)
         ON CONFLICT (user_id) DO UPDATE SET vehicle_type=EXCLUDED.vehicle_type, max_stops=EXCLUDED.max_stops, is_active=true`,
        [riderId, process.env.SEED_RIDER_VEHICLE_TYPE, Number(process.env.SEED_RIDER_MAX_STOPS)]
      );

      await client.query('COMMIT');
      console.log('Seeded manager and rider');
      console.log('Manager:', managerEmail);
      console.log('Rider:', riderEmail);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('Seed failed:', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
