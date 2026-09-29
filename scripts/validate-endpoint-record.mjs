#!/usr/bin/env node
import { readFileSync } from "node:fs";

const PRIVATE_HOSTS = [/^localhost$/i, /^127\\./, /^10\\./, /^192\\.168\\./, /^172\\.(1[6-9]|2\\d|3[01])\\./];

export function validateEndpoint(record) {
  const errors = [];
  if (record?.service !== "omnikali") errors.push("service must be omnikali");
  if (!["available", "unavailable"].includes(record?.status)) errors.push("status must be available or unavailable");
  if (record?.status === "unavailable") {
    if (record.endpoint !== null) errors.push("unavailable status must have endpoint=null");
    if (record.health !== null) errors.push("unavailable status must have health=null");
  }
  if (record?.status === "available") {
    if (typeof record.endpoint !== "string") errors.push("available status requires endpoint");
    else {
      let parsed;
      try { parsed = new URL(record.endpoint); } catch { errors.push("endpoint must be a valid URL"); }
      if (parsed) {
        if (parsed.protocol !== "https:") errors.push("published endpoint must use HTTPS");
        if (PRIVATE_HOSTS.some(re => re.test(parsed.hostname))) errors.push("private/loopback endpoint cannot be published");
      }
    }
    if (!record.health) errors.push("available status requires health evidence");
  }
  return { schema: "omnikali-discovery/v1", status: errors.length ? "FAIL" : "PASS", errors };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = validateEndpoint(JSON.parse(readFileSync("endpoint.json", "utf8")));
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.status === "PASS" ? 0 : 1;
}
