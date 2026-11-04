import crypto from 'crypto';

export function hashAddress(address) {
  const normalized = String(address || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}
