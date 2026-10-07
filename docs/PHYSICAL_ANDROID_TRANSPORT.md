# Physical Android transport: canonical launcher

Effective 2026-10-07. This policy supersedes physical-phone launch instructions in dated transport snapshots; those snapshots retain their original evidence.

Physical Android automation must use `broccoli-core/lib/rish_run.sh`. The supported `broccoli-core/bin/broccoli-rish` entry point delegates to that same implementation. Do not invoke a downloaded `rish`, a hard-coded `/usr/bin/rish -c`, or a copied wrapper as the public automation launcher. Raw Rish remains an internal Shizuku driver managed by broccoli-core.

From Termux or an RDC shell on the verified physical Android node:

```sh
BROCCOLI_ROOT="${BROCCOLI_ROOT:-$HOME/broccoli-core}"
RISH_PRESERVE_ENV=0 bash "$BROCCOLI_ROOT/lib/rish_run.sh" 'printf "BROCCOLI_RISH_OK\n"; id; getprop ro.build.version.sdk'
```

Acceptance requires the marker, `uid=2000(shell)`, and the device SDK; zero exit with empty output is insufficient. Fresh physical-phone evidence supplied by the coordinator on 2026-10-07 binds broccoli-core commit `d74726a`, uid 2000 and SDK 35. This documentation edit does not independently retest or broaden that acceptance.

The raw driver path and captured Android environment belong to broccoli-core configuration (`BROCCOLI_RISH_BIN`, `BROCCOLI_RISH_ENV`). After Shizuku migration, configure the existing core wrapper for the installed driver; never revive the retired launcher or persist credentials/full environments in Git. Respect Shizuku authorization and core errors 78/79.

Remote Android remains customizable: an authenticated ADB transport or another documented executor may be selected explicitly for its verified node. This physical launcher policy does not force Rish onto an OCI guest. Bind acceptance to repository commit, node, transport, marker, timeout and resource envelope. Physical Rish PASS does not imply OCI R2 PASS.

Observing an event never authorizes replay of its command. Preserve cloud chat and existing sessions while changing launcher configuration.
