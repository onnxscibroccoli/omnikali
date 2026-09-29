# OmniKali Public Door

**Status:** Active stable public discovery/entry layer  
**Repository:** `onnxscibroccoli/omnikali`  
**Documentation snapshot:** 2026-09-28 23:12 EDT

This repository is the stable GitHub Pages front door for OmniKali Track B. It is intentionally separate from the Kali workstation and from the older `omnikali-link` Vercel pointer.

## What it does

The page reads `endpoint.json`, adds a cache-busting timestamp, and health-probes candidate origins. It only presents a connect target when the published endpoint reports the expected health/readiness condition.

This prevents a stale or dead tunnel hostname from becoming a misleading “working” desktop link.

The repository therefore implements **service discovery and safe public routing**, not the workstation itself.

## Contents

Approximately 20 tracked files are present.

Important files:

- `index.html` — public door.
- `endpoint.json` — current externally verified endpoint record.
- `security.html` — security information.
- `404.html` — failure page.
- `.github/workflows/pages.yml` — publication workflow.
- `.github/workflows/probe.yml` — endpoint probing.
- `.github/scripts/probe-endpoint.mjs` — probe logic.
- `.github/agents/` — agent contracts for connection, ingress, KVM, orchestration, pages, recovery, supervisor, and related operations.
- `docs/` — dated architecture verification and Gemini-connected-app restoration material.

## Development cycle

**ACTIVE PRODUCTION-EDGE COMPONENT / FAIL-CLOSED DISCOVERY.**

Recent commits refresh `endpoint.json` from external health probes and record dated AWS architecture verification.

The critical rule is:

> A healthy local loopback service is not enough to publish an external endpoint.

The public endpoint should be published only after an external probe establishes health.

## How to use it

For a user, visit the GitHub Pages path documented by the repository.

For an operator, inspect:

```text
endpoint.json
.github/scripts/probe-endpoint.mjs
.github/workflows/probe.yml
docs/
```

Do not manually replace a live endpoint with an arbitrary tunnel URL.

## AI model instructions

An AI working on the public door should:

1. inspect the current endpoint record;
2. externally verify the target health;
3. distinguish “QEMU is running” from “RFB is usable”;
4. distinguish “gateway is reachable” from “authenticated desktop is usable”;
5. fail closed when health is absent;
6. never resurrect an obsolete Cloudflare/tunnel URL simply because it appeared in history.

For architecture changes, inspect `kali-node`, Helix, Grasshopper, and grasshopper-kubernetes before modifying this edge layer.

**Bottom line:** OmniKali's stable public name and health-aware discovery layer, not the desktop implementation.
