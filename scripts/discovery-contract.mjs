import { isIP } from 'node:net';

export const EVIDENCE_TTL_MS = 12 * 60 * 60 * 1000;
export const HEALTH_PATH = '/api/public/health';
export const STATUS = Object.freeze({ AVAILABLE: 'available', UNAVAILABLE: 'unavailable' });

function approvedSet(hostnames) {
  if (!Array.isArray(hostnames)) return new Set();
  return new Set(hostnames.filter(x => typeof x === 'string').map(x => x.toLowerCase()));
}

export function approvedOrigin(value, approvedHosts) {
  if (typeof value !== 'string' || value.length > 512) return null;
  let url;
  try { url = new URL(value); } catch { return null; }
  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password ||
      url.port && url.port !== '443' ||
      url.pathname !== '/' || url.search || url.hash ||
      isIP(hostname.replace(/^\[|\]$/g, '')) ||
      !/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(hostname) ||
      !approvedSet(approvedHosts).has(hostname)) return null;
  return url.origin;
}

function ipv4Public(value) {
  const n = value.split('.').map(Number);
  const [a,b,c] = n;
  if (a === 0 || a === 10 || a === 127 || a >= 224 ||
      a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 ||
      a === 192 && (b === 168 || b === 0 && c === 0 || b === 0 && c === 2) ||
      a === 100 && b >= 64 && b <= 127 ||
      a === 198 && (b === 18 || b === 19 || b === 51 && c === 100) ||
      a === 203 && b === 0 && c === 113) return false;
  return true;
}

export function publicIp(address) {
  if (isIP(address) === 4) return ipv4Public(address);
  if (isIP(address) !== 6) return false;
  const s = address.toLowerCase();
  // Reject IPv4-mapped, translation/tunnel protocols, documentation and
  // local/special-use destinations. Only native global-unicast 2000::/3.
  if (s.includes('.') || s.startsWith('::') || s.startsWith('0:') ||
      s.startsWith('fc') || s.startsWith('fd') || s.startsWith('fe') ||
      s.startsWith('2001:db8:') || s.startsWith('2002:') ||
      s.startsWith('2001:0:')) return false;
  const first = Number.parseInt(s.split(':')[0], 16);
  return Number.isInteger(first) && first >= 0x2000 && first <= 0x3fff;
}

export function healthIsReachable(body) {
  return Boolean(body && typeof body === 'object' && !Array.isArray(body) &&
    body.service === 'omnikali' &&
    (body.status === 'ready' || body.rfb === true));
}

export function fresh(instant, nowMs = Date.now()) {
  if (typeof instant !== 'string') return false;
  const parsed = Date.parse(instant);
  return Number.isFinite(parsed) && parsed <= nowMs + 60000 &&
    nowMs - parsed >= -60000 && nowMs - parsed <= EVIDENCE_TTL_MS;
}

export function validateEndpoint(record, approvedHosts = [], nowMs = Date.now()) {
  const errors = [];
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return { schema: 'omnikali-discovery/v3', status: 'FAIL', errors: ['record must be an object'] };
  }
  if (record.service !== 'omnikali') errors.push('service must be omnikali');
  if (![STATUS.AVAILABLE, STATUS.UNAVAILABLE].includes(record.status)) {
    errors.push('canonical status required: available or unavailable');
  }
  if (record.version !== 3 && !(record.version === 2 && record.status === STATUS.UNAVAILABLE)) {
    errors.push('version 3 required for availability; v2 unavailable is legacy-compatible');
  }
  if (record.status === STATUS.UNAVAILABLE) {
    if (record.endpoint !== null || record.health !== null) {
      errors.push('unavailable record must clear endpoint and health');
    }
  }
  if (record.status === STATUS.AVAILABLE) {
    const origin = approvedOrigin(record.endpoint, approvedHosts);
    if (!origin || origin !== record.endpoint) {
      errors.push('available endpoint must be an exact approved HTTPS origin');
    }
    if (!origin || record.health !== origin + HEALTH_PATH) {
      errors.push('health URL must be the exact approved public-health path');
    }
    const evidence = record.verification;
    if (!evidence || evidence.kind !== 'PUBLIC_HEALTH_ONLY' ||
        evidence.result !== 'PASS' || !fresh(evidence.checkedAt, nowMs)) {
      errors.push('fresh public-health verification required');
    }
  }
  const candidateList = record.candidates;
  if (!Array.isArray(candidateList) || candidateList.length > 25 ||
      candidateList.some(u => approvedOrigin(u, approvedHosts) === null)) {
    errors.push('all configured candidate endpoints must be explicitly approved');
  }
  return { schema: 'omnikali-discovery/v3',
    status: errors.length ? 'FAIL' : 'PASS', errors };
}
