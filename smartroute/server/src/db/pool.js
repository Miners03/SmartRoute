import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

export const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
  database: 'smartroute',
});

export async function query(text, params) {
  const res = await pool.query(text, params);
  return res;
}

export async function getClient() {
  return pool.connect();
}
