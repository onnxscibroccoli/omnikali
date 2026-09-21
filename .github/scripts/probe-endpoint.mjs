#!/usr/bin/env node
/**
 * GitHub Actions probe: re-read endpoint.json, hit each candidate's
 * /api/public/health from GitHub's network, and rewrite the record.
 * Never promotes a Cloudflare "Port is not found" host.
 */
import { readFileSync, writeFileSync } from "node:fs";

function gatewayIsLive(body) {
  if (!body || body.service !== "omnikali") return false;
  if (body.rfb === true) return true;
  return body.status === "ready";
}

async function probe(base) {
  const origin = String(base || "").replace(/\/$/, "");
  try {
    const res = await fetch(`${origin}/api/public/health`, {
      signal: AbortSignal.timeout(8000),
      redirect: "manual",
      headers: { accept: "application/json" },
    });
    const text = await res.text();
    if (/Port .+ is not found/i.test(text)) return { origin, live: false, reason: "port not found" };
    if (res.status !== 200) return { origin, live: false, reason: `http ${res.status}` };
    if (!(res.headers.get("content-type") || "").includes("json")) {
      return { origin, live: false, reason: "not json" };
    }
    const body = JSON.parse(text);
    return { origin, live: gatewayIsLive(body), body, reason: gatewayIsLive(body) ? "ok" : "not live" };
  } catch (err) {
    return { origin, live: false, reason: err instanceof Error ? err.message : "fetch failed" };
  }
}

const rec = JSON.parse(readFileSync("endpoint.json", "utf8"));
const bases = [...new Set([rec.endpoint, ...(rec.candidates || [])].filter(Boolean).map((c) => String(c).replace(/\/$/, "")))];
let live = null;
for (const base of bases) {
  const hit = await probe(base);
  console.log(JSON.stringify(hit));
  if (hit.live && !live) live = hit;
}
const next = {
  ...rec,
  service: "omnikali",
  version: 2,
  status: live ? "live" : "unavailable",
  endpoint: live ? live.origin : null,
  health: live ? `${live.origin}/api/public/health` : null,
  omnikaliLink: "retired",
  dns: rec.dns ?? null,
  updatedAt: new Date().toISOString(),
  note: live
    ? "Public health passed. Pages may redirect here."
    : "No live public gateway. Pages must show temporarily unavailable. Do not redirect to a missing sandbox port.",
};
writeFileSync("endpoint.json", `${JSON.stringify(next, null, 2)}\n`);
