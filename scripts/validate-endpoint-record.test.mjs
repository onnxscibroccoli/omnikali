import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEndpoint } from './validate-endpoint-record.mjs';

const hostnames = ['gateway.example.org'];

function unavailable() {
  return { service: 'omnikali', version: 3, status: 'unavailable',
    endpoint: null, health: null, candidates: [], verification: null };
}
function available() {
  return { service: 'omnikali', version: 3, status: 'available',
    endpoint: 'https://gateway.example.org',
    health: 'https://gateway.example.org/api/public/health',
    candidates: ['https://gateway.example.org'],
    verification: { kind: 'PUBLIC_HEALTH_ONLY', result: 'PASS',
      checkedAt: new Date().toISOString() } };
}
test('current unavailable record is fail-closed and valid', () => {
  assert.equal(validateEndpoint(unavailable(), hostnames).status, 'PASS');
});
test('legacy v2 unavailable remains compatible without asserting availability', () => {
  assert.equal(validateEndpoint({ ...unavailable(), version: 2 }, hostnames).status, 'PASS');
});
test('available record requires a fresh host-approved exact HTTPS origin', () => {
  assert.equal(validateEndpoint(available(), hostnames).status, 'PASS');
});
test('private, HTTP, credential-bearing or non-allowlisted origins reject', () => {
  for (const endpoint of ['http://127.0.0.1:8080', 'https://10.0.0.3',
    'http://gateway.example.org', 'https://user:password@gateway.example.org',
    'https://attacker.example.org', 'https://gateway.example.org/extra',
    'javascript:alert(1)', 'https://gateway.example.org@attacker.example.org']) {
    const r = validateEndpoint({ ...available(), endpoint }, hostnames);
    assert.equal(r.status, 'FAIL', endpoint);
  }
});
test('available record cannot assert arbitrary health URL', () => {
  assert.equal(validateEndpoint({ ...available(), health: 'https://gateway.example.org/health' }, hostnames).status, 'FAIL');
});
test('stale public-health evidence rejects', () => {
  const rec = available();
  rec.verification.checkedAt = new Date(Date.now() - 13*60*60*1000).toISOString();
  assert.equal(validateEndpoint(rec, hostnames).status, 'FAIL');
});
test('forged health mode or result rejects', () => {
  const rec = available();
  rec.verification.kind = 'AUTHENTICATED_DESKTOP';
  assert.equal(validateEndpoint(rec, hostnames).status, 'FAIL');
  rec.verification.kind = 'PUBLIC_HEALTH_ONLY';
  rec.verification.result = 'NOT_TESTED';
  assert.equal(validateEndpoint(rec, hostnames).status, 'FAIL');
});
test('unapproved candidates reject even if published status unavailable', () => {
  const rec = { ...unavailable(), candidates: ['https://bad.example.org'] };
  assert.equal(validateEndpoint(rec, hostnames).status, 'FAIL');
});
test('unavailable status cannot retain a live endpoint', () => {
  const rec = { ...unavailable(), endpoint: 'https://gateway.example.org' };
  assert.equal(validateEndpoint(rec, hostnames).status, 'FAIL');
});
test('published status must be canonical, not live', () => {
  assert.equal(validateEndpoint({ ...available(), status: 'live' }, hostnames).status, 'FAIL');
});
