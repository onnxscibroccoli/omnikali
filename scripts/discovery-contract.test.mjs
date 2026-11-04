import test from 'node:test';
import assert from 'node:assert/strict';
import { approvedOrigin, publicIp, healthIsReachable, fresh } from './discovery-contract.mjs';

test('origin must match exact approved hostname and HTTPS origin', () => {
  const allowed = ['gateway.example.org'];
  assert.equal(approvedOrigin('https://gateway.example.org', allowed), 'https://gateway.example.org');
  assert.equal(approvedOrigin('https://GATEWAY.EXAMPLE.ORG', allowed), 'https://gateway.example.org');
  for (const address of [
    'http://gateway.example.org', 'https://gateway.example.org.evil.test',
    'https://evil.test', 'https://evil.test/gateway.example.org',
    'https://user:pass@gateway.example.org', 'https://gateway.example.org:8443',
    'https://gateway.example.org/redirect', 'https://gateway.example.org?next=evil',
    'https://127.0.0.1', 'https://[::1]', 'file:///etc/passwd',
  ]) assert.equal(approvedOrigin(address, allowed), null, address);
});
test('private and special-use DNS answers are rejected before opening sockets', () => {
  for (const ip of [
    '127.0.0.1', '10.0.0.10', '192.168.10.1', '169.254.100.22',
    '172.16.0.1', '172.31.2.1', '100.65.10.1', '198.18.0.1',
    '192.0.2.1', '198.51.100.2', '203.0.113.9', '0.0.0.0',
    '::1', 'fe80::1', 'fc00::1', 'fd00::123', '2001:db8::1',
    '::ffff:127.0.0.1', '2002:c0a8:0101::',
  ]) assert.equal(publicIp(ip), false, ip);
});
test('regular publicly routable IPv4 and IPv6 DNS results are accepted', () => {
  for (const ip of ['8.8.8.8', '1.1.1.1', '2001:4860:4860::8888']) {
    assert.equal(publicIp(ip), true, ip);
  }
});
test('public health is gateway reachability only, never authenticated desktop proof', () => {
  assert.equal(healthIsReachable({ service: 'omnikali', status: 'ready' }), true);
  assert.equal(healthIsReachable({ service: 'other', rfb: true }), false);
  assert.equal(healthIsReachable({ service: 'omnikali', status: 'login_required' }), false);
  assert.equal(healthIsReachable(null), false);
});
test('evidence freshness requires an unexpired, not-future timestamp', () => {
  const now = Date.parse('2026-11-04T13:00:00Z');
  assert.equal(fresh('2026-11-04T12:00:00Z', now), true);
  assert.equal(fresh('2026-11-03T00:00:00Z', now), false);
  assert.equal(fresh('2026-11-05T00:00:00Z', now), false);
});
