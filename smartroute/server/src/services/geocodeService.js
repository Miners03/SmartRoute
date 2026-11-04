import { query } from '../db/pool.js';
import { hashAddress } from '../utils/addressHash.js';
import { NominatimProvider } from '../providers/geocode/NominatimProvider.js';

const provider = new NominatimProvider();

export async function geocode(address) {
  const h = hashAddress(address);
  const cached = await query('SELECT lat, lng, display_name FROM geocode_cache WHERE address_hash = $1', [h]);
  if (cached.rowCount > 0) {
    const row = cached.rows[0];
    return { ok: true, lat: Number(row.lat), lng: Number(row.lng), displayName: row.display_name, cached: true };
  }
  const result = await provider.geocode(address);
  if (result.ok) {
    await query(
      `INSERT INTO geocode_cache (address_hash, lat, lng, display_name)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (address_hash) DO NOTHING`,
      [h, result.lat, result.lng, result.displayName || null]
    );
    return result;
  }
  // map to statuses
  if (result.reason === 'not_found') return { ok: false, status: 'not_found' };
  if (result.reason === 'ambiguous') return { ok: false, status: 'ambiguous' };
  return { ok: false, status: 'not_found' };
}
