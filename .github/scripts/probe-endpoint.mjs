#!/usr/bin/env node
// Bounded public-health evidence collection. Never equate this with
// authenticated desktop readiness or an authorized production deployment.
import { readFileSync, writeFileSync } from 'node:fs';
import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import {
  approvedOrigin, publicIp, healthIsReachable, fresh,
  HEALTH_PATH, STATUS
} from '../../scripts/discovery-contract.mjs';
import { approvedHostnames, validateEndpoint } from '../../scripts/validate-endpoint-record.mjs';

const MAX_BODY_BYTES = 32768;
const MAX_PROBE_MS = 8000;
const hostnames = approvedHostnames();

function getBody(url, address) {
  return new Promise((resolve, reject) => {
    let length = 0;
    const buffers = [];
    const req = request(url, {
      method: 'GET',
      timeout: MAX_PROBE_MS,
      maxHeaderSize: 8192,
      headers: { accept: 'application/json' },
      lookup(_host, _opts, callback) {
        callback(null, address.address, address.family);
      }
    }, response => {
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error('public health returned HTTP ' + response.statusCode));
        return;
      }
      if (!String(response.headers['content-type'] || '').toLowerCase().includes('application/json')) {
        response.resume();
        reject(new Error('public health response was not application/json'));
        return;
      }
      response.on('data', chunk => {
        length += chunk.length;
        if (length > MAX_BODY_BYTES) {
          req.destroy(new Error('public health exceeded body limit'));
          return;
        }
        buffers.push(chunk);
      });
      response.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(buffers).toString('utf8'))); }
        catch { reject(new Error('invalid public health JSON')); }
      });
      response.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('public health timed out')));
    req.on('error', reject);
    req.end();
  });
}

async function probe(url) {
  const origin = approvedOrigin(url, hostnames);
  if (!origin) throw new Error('candidate endpoint is not an approved exact HTTPS origin');
  const host = new URL(origin).hostname;
  let answers;
  try {
    answers = await Promise.race([
      lookup(host, { all: true, verbatim: true }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DNS resolution timed out')), MAX_PROBE_MS))
    ]);
  } catch (error) {
    return { origin, live: false, reason: 'DNS_ERROR: ' + error.message };
  }
  if (!answers.length || answers.some(entry => !publicIp(entry.address))) {
    return { origin, live: false, reason: 'DNS_RESOLVED_TO_NON_PUBLIC_ADDRESS' };
  }
  try {
    // Request uses a fixed, prevalidated address. It cannot re-resolve
    // to a private IP between the DNS preflight and the TLS connection.
    const body = await getBody(origin + HEALTH_PATH, answers[0]);
    return { origin, live: healthIsReachable(body),
      reason: healthIsReachable(body) ? 'PUBLIC_HEALTH_OK' : 'PUBLIC_HEALTH_NOT_READY' };
  } catch (error) {
    return { origin, live: false, reason: 'PROBE_FAILED: ' + error.message };
  }
}

const record = JSON.parse(readFileSync('endpoint.json', 'utf8'));
const candidates = [...new Set([record.endpoint, ...(record.candidates || [])]
  .filter(Boolean).map(x => String(x).replace(/\/$/, '')))];
for (const candidate of candidates) {
  if (!approvedOrigin(candidate, hostnames)) {
    throw new Error('rejecting non-allowlisted endpoint candidate before network access');
  }
}

let successful = null;
for (const candidate of candidates) {
  const result = await probe(candidate);
  console.log(JSON.stringify(result));
  if (result.live && !successful) successful = result;
}
const timestamp = new Date().toISOString();
const next = {
  ...record, service: 'omnikali', version: 3,
  status: successful ? STATUS.AVAILABLE : STATUS.UNAVAILABLE,
  endpoint: successful?.origin ?? null,
  health: successful ? successful.origin + HEALTH_PATH : null,
  verification: successful
    ? { kind: 'PUBLIC_HEALTH_ONLY', result: 'PASS', checkedAt: timestamp }
    : null,
  omnikaliLink: 'retired',
  updatedAt: timestamp,
  note: successful
    ? 'Bounded public gateway health passed. Authenticated desktop acceptance remains separate.'
    : 'No approved live public gateway. Browser must remain unavailable.'
};
const same = ['service', 'version', 'status', 'endpoint', 'health', 'omnikaliLink',
  'dns', 'note', 'candidates'].every(key =>
    JSON.stringify(next[key] ?? null) === JSON.stringify(record[key] ?? null));
if (same && (!successful || fresh(record.verification?.checkedAt))) {
  console.log('meaningful discovery state unchanged; not rewriting endpoint.json');
  process.exit(0);
}
const verdict = validateEndpoint(next, hostnames);
if (verdict.status !== 'PASS') {
  throw new Error('refusing to write invalid endpoint record: ' + verdict.errors.join('; '));
}
writeFileSync('endpoint.json', JSON.stringify(next, null, 2) + '\n');
