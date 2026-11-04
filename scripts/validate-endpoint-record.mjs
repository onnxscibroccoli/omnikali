#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateEndpoint as validateContract } from './discovery-contract.mjs';

const defaultConfig = fileURLToPath(new URL('../config/approved-endpoint-hosts.json', import.meta.url));
export function approvedHostnames(configPath = defaultConfig) {
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  if (config.schemaVersion !== 1 || !Array.isArray(config.hostnames)) {
    throw new Error('invalid approved-host registry');
  }
  return config.hostnames;
}
export function validateEndpoint(record, hostnames = approvedHostnames(), nowMs = Date.now()) {
  return validateContract(record, hostnames, nowMs);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(new URL('file://' + process.argv[1]))) {
  const result = validateEndpoint(JSON.parse(readFileSync('endpoint.json', 'utf8')));
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.status === 'PASS' ? 0 : 1;
}
