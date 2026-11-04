import { GeocodeProvider } from './GeocodeProvider.js';
import { env } from '../../config/env.js';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export class NominatimProvider extends GeocodeProvider {
  constructor() {
    super();
    this.lastCall = 0;
    this.minInterval = 1000 / Number(env.GEOCODE_MAX_QPS || 1);
  }

  async throttle() {
    const now = Date.now();
    const wait = Math.max(0, this.lastCall + this.minInterval - now);
    if (wait > 0) await sleep(wait);
    this.lastCall = Date.now();
  }

  async geocode(address) {
    await this.throttle();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(env.GEOCODE_TIMEOUT_MS || 5000));
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=5`;
      const res = await fetch(url, {
        headers: { 'User-Agent': env.NOMINATIM_USER_AGENT },
        signal: controller.signal,
      });
      if (res.status === 429) {
        await sleep(Number(env.GEOCODE_RETRY_BACKOFF_MS || 500));
        // retry once
        await this.throttle();
        const res2 = await fetch(url, {
          headers: { 'User-Agent': env.NOMINATIM_USER_AGENT },
          signal: controller.signal,
        });
        if (!res2.ok) return { ok: false, reason: 'http_error' };
        const data2 = await res2.json();
        if (!Array.isArray(data2) || data2.length === 0) return { ok: false, reason: 'not_found' };
        if (data2.length > 1) return { ok: false, reason: 'ambiguous' };
        return { ok: true, lat: Number(data2[0].lat), lng: Number(data2[0].lon), displayName: data2[0].display_name };
      }
      if (!res.ok) return { ok: false, reason: 'http_error' };
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) return { ok: false, reason: 'not_found' };
      if (data.length > 1) return { ok: false, reason: 'ambiguous' };
      return { ok: true, lat: Number(data[0].lat), lng: Number(data[0].lon), displayName: data[0].display_name };
    } catch (e) {
      return { ok: false, reason: 'network_error' };
    } finally {
      clearTimeout(timeout);
    }
  }
}
