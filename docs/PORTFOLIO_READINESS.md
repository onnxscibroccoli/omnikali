# Portfolio reviewer readiness — omnikali

**Focus:** Static OmniKali discovery and gateway health pointer  
**Current evidence status:** `HEALTH_PROBE_CI_EXECUTED` (2026-11-11 snapshot; **not** production approval).  
**Tracking:** [repository issue](https://github.com/onnxscibroccoli/omnikali/issues/9) · [portfolio master ledger](https://github.com/onnxscibroccoli/broccoli-core/issues/102)  


## Inspect actual source
- [endpoint.json](https://github.com/onnxscibroccoli/omnikali/blob/main/endpoint.json)
- [index.html](https://github.com/onnxscibroccoli/omnikali/blob/main/index.html)
- [README.md](https://github.com/onnxscibroccoli/omnikali/blob/main/README.md)

**Scoped reference workflow run:** [Inspect the historical GitHub Actions result](https://github.com/onnxscibroccoli/omnikali/actions/runs/43037114971). Verify its SHA/branch before attributing it to current source; CI success is not live/production evidence.
Recorded 2026-11-11:
- Run 43037114971 is `Probe OmniKali gateway`, a `schedule` event at `main` `925dc33c43f0d163acf40939ede694cbf591655c`, conclusion success.
- Current `main` `b42c2a8` is that probe's own `endpoint.json` refresh.
- A **successful probe run means the probe executed; its result was `"status": "unavailable"`, `"endpoint": null`**. That is not a healthy gateway.
- This repository's `pages` workflow has failed on every recorded push (latest [run 36531407588](https://github.com/onnxscibroccoli/omnikali/actions/runs/36531407588), 2026-09-29), and the repository has no Pages site configured.
- `https://onnxscibroccoli.github.io/omnikali/` is served by the `onnxscibroccoli.github.io` user-site repository. Its `endpoint.json` is a stale copy (`updatedAt` 2026-09-22).
- Probe commits pushed with the default `GITHUB_TOKEN` do not trigger push workflows.

## First reviewer command (check prerequisites before executing)

```sh
python3 -m json.tool endpoint.json >/dev/null
```

This is a proposed reproduction command, **not a claim of executed testing**. Confirm the command exists in the current repository; record missing scripts/dependencies as NOT_VERIFIED rather than masking failures.

## Ordered implementation queue

1. [ ] Expose endpoint freshness/health contract without claiming a live Kali guest.
2. [ ] Make canonical ownership links to Helix and Grasshopper explicit.
3. [ ] Link scheduled probe CI to exact tested endpoint and limitations.
4. [ ] Document authenticated remote desktop acceptance separately from pointer health.

## Evidence promotion gate

A project is not ready for a public professional demonstration merely because it has a README, an Actions schedule, or a test result unrelated to its claimed behavior. Provide exact source SHA, real test scope, negative controls, and meaningful limitations. Production or hardware assertions require an authorized real environment and appropriately scoped acceptance.

## Safe resumption

Inspect this issue and the master ledger, refresh the repo's `main` head and relevant PRs, implement the first unchecked item on a draft PR, attach exact test evidence and update the tracker. Avoid mass merging, secret exposure, false human review, and speculative employment claims.
