# Connection machine keeper

RFB_NOT_READY is not VM_NOT_RUNNING. RFB_NOT_READY is not USER_DISCONNECTED.

## Directive

Track B frontend only. Do not rebuild the Kali guest. Do not touch `omnikali-link`. Do not replace RFB with JPEG polling.

## Invariants

1. Missing RFB banner while QEMU and SSH are up is `DESKTOP_STARTING`, never `VM_BOOTING`.
2. Unexpected WebSocket/RFB loss is `RECONNECTING`, never `VM_BOOTING`.
3. Hang-up is `DISCONNECTED` with `wantAttached=false`. The guest persists.
4. `CONNECTED` is assigned only after a real noVNC framebuffer handshake.
5. Probe results are generation-guarded. A stale T1/T2 observation must not rewind T5 `CONNECTED`.
6. Invalid/expired tickets are `SESSION_EXPIRED`. Missing sign-in is `AUTH_REQUIRED`. Neither is a VM failure.
7. `READY_TO_ATTACH` auto-attaches with 800ms–8s backoff. Do not require a second Attach click.
8. Authenticated attach starts QEMU if it is down. `VM_OFFLINE` is not a dead-end.
9. Record regressions as issues on `onnxscibroccoli/kali-node`.
