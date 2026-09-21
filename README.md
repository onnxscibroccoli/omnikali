# OmniKali public door

Static GitHub Pages front door for OmniKali Track B.

- Permanent URL: [https://onnxscibroccoli.github.io/omnikali/](https://onnxscibroccoli.github.io/omnikali/)
- Source repo: [onnxscibroccoli/omnikali](https://github.com/onnxscibroccoli/omnikali)
- Workstation source: [onnxscibroccoli/kali-node](https://github.com/onnxscibroccoli/kali-node)
- Service record: [`endpoint.json`](./endpoint.json) (discovery, not JPEG transport)
- Ingress: [`../INGRESS.md`](../INGRESS.md)

This folder/repo is **not** the Kali VM and **not** `omnikali-link`.

The door reads `endpoint.json?ts=<now>` (GitHub Pages otherwise caches the
pointer for ~10 minutes), CORS-probes `{base}/api/public/health` **in order**
(published endpoint first, candidates only as failover), and redirects only
when `status === "ready"` or `rfb === true`. QEMU-up-without-RFB and `booting`
are not a connect target. If health fails, the page shows **OmniKali
workstation temporarily unavailable** and retries. It will not send you to
Cloudflare `Port hds-… is not found`.

`endpoint` stays `null` until an **external** probe of a candidate returns
health 200. Local loopback being healthy is not enough to publish a URL.

GitHub Pages is the stable name. The value in `endpoint` is the current
gateway (a Quick Tunnel origin until a named tunnel / owned domain exists).
`dns` stays `null` until that named hostname exists.
