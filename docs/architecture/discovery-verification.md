# OmniKali discovery: publication trust contract

**Lifecycle:** Proposed / offline validation implementation (2026-11-04).  
**Source owner:** `onnxscibroccoli/omnikali`, public discovery layer only.  
**Production desktop owner:** Helix/Kali, **not** this repository.  
**Evidence class:** `PUBLIC_HEALTH_ONLY`; authenticated guest desktop status remains NOT_TESTED.

## What this changes

A public page is a pointer to a workstation, not the workstation itself.
A successful public `/api/public/health` response cannot establish that
authentication, an RFB session, or a persistent guest desktop works.

Previously, the scheduled probe emitted `status: "live"` while the validator
accepted `"available"`. The browser also ignored the published status
and probed arbitrary `candidates`, accepting plain HTTP and a different
`/health` URL. These inconsistencies risked publishing misleading targets.

The proposed canonical states are **available** and **unavailable**.
A v2 unavailable record remains compatible; only v3 can assert availability.

## Approved origin and probe contract

`config/approved-endpoint-hosts.json` contains an explicit exact-host
allowlist. It is **empty by default**, because no current public origin is
confirmed in the repository snapshot. Adding a hostname requires a separate
authorized configuration change based on real deployment evidence.

The scheduled probe must:
1. reject unapproved candidates **before** any DNS request;
2. require an HTTPS origin with no credentials, nondefault port, path, query or fragment;
3. resolve DNS and reject any answer in private, local, link-local,
   documentation, or other blocked ranges;
4. connect to a prevalidated DNS address with TLS hostname verification
   (no second lookup/rebinding between preflight and connection);
5. reject redirects, unexpected response status or media type,
   responses over 32 KiB, invalid JSON, and probe timeouts;
6. require an OmniKali public-health payload indicating gateway reachability;
7. publish `available` only with `verification.kind=PUBLIC_HEALTH_ONLY`,
   `verification.result=PASS` and a recent `checkedAt`.
   
No auto-followed redirect can change the probed host. The public record's
`health` must be exactly `endpoint + /api/public/health`.
A public-health pass **does not** authorize a workstation session.

## Freshness and avoiding meaningless commits

The record's evidence expires after 12 hours. Repeated 15-minute checks
that do not change material state do not update `endpoint.json` while
the evidence remains fresh. Available evidence is renewed when it
expires, so publication can remain fail-closed without commits on every
probe. Unavailable records never invent a live origin.

A separate GitHub Actions record should be retained if the operator needs
to prove every intermediate probe; the source-control record is not
a permanent immutable health journal.

## Browser behavior

The public door loads `endpoint.json` and the approved-host registry
from the same Pages publication, verifies version/state/host/freshness,
then repeats the live public-health probe before enabling a link.
It never follows an unapproved candidate from `endpoint.json`.
The status label is `GATEWAY ONLINE`, not `AUTHENTICATED DESKTOP READY`.

The browser's CORS and network sandbox is not equivalent to a server-side
DNS egress policy. Its defense is a trusted published registry plus the
server-side validated record. Repository write and Pages deployment
authorization remain trusted source-publication boundaries.

## Reproduction and negative controls

```sh
node --test scripts/*.test.mjs
node scripts/validate-endpoint-record.mjs
node --check .github/scripts/probe-endpoint.mjs
```

The test matrix covers malformed records, unapproved exact hosts, HTTP,
URL credentials/ports/paths, private/loopback/dedicated IP ranges, invalid
health paths, stale evidence, arbitrary candidate substitution, and
canonical-state mismatch. This is **offline contract evidence**, not a
live external health or authenticated desktop acceptance test.

## Remaining approvals and limitations

- **Host allowlist:** empty until an exact, currently authorized gateway
  hostname is supplied and independently tested.
- **Live proof:** no public approved gateway is verified by this PR.
- **Real desktop proof:** login, ticketed WSS, RFB frames and control
  require separate authorized acceptance in Helix/Kali.
- **Production publication:** no Pages deployment is authorized by this
  documentation; the PR remains reviewable until the owner merges it.
- **Availability:** an isolated portal cannot provide a workstation if
  the production gateway is unavailable. It must not silently substitute
  a historical tunnel.
- **Network hardening:** do not treat an allowlist alone as protection
  if future implementations change DNS pinning or TLS validation.

## Related references

- `scripts/discovery-contract.mjs`: canonical pure validation.
- `scripts/validate-endpoint-record.mjs`: publication verdict.
- `.github/scripts/probe-endpoint.mjs`: scheduled guarded probe.
- `.github/workflows/discovery-validation.yml`: offline negative controls.
- `.github/workflows/pages.yml`: publication rejection gate.
- OmniKali canonical graph `OMNIKALI-SYSTEM-KG-2026-10-01`.

**Technical status:** awaiting current PR CI; **governance:** owner review
pending; **production readiness:** NOT_VERIFIED.
