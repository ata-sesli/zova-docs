# Diagnostics and salvage

Diagnostics inspect without mutating the source file.

```sh
zova check app.zova
zova check --deep app.zova
zova doctor --json app.zova
zova salvage --dry-run damaged.zova
```

`check` verifies structural expectations; deep mode inspects specialized storage and bound-store consistency. `doctor` explains health findings and suggests explicit next actions. JSON output is suitable for tooling and remains privacy-aware.

## Salvage

```sh
zova salvage damaged.zova recovered.zova
```

Salvage writes readable, validated content to a new destination. It never modifies the source or overwrites a destination. A verified backup remains preferable.

Graph salvage copies valid topology and skips invalid nodes or edges. Extension-private tables are never copied by guessing: trusted extension hooks decide how to copy, rebuild, or skip their own storage. Missing hooks are reported.

Diagnostic output avoids object bytes, vector values, indexed text, private schema SQL, and arbitrary user-row values.

