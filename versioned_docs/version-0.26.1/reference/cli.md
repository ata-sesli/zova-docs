# CLI reference

The `zova` CLI is designed for bounded inspection, diagnostics, migration, recovery, store placement, and extension management. It avoids printing bulk data or arbitrary application rows by default.

Run `zova --help` or `zova <command> --help` for the complete argument contract of the installed version. The examples below show the command families and intended workflows.

## Identify a database

```sh
zova info app.zova
zova stats app.zova
zova stats --json app.zova
zova tables app.zova
```

Use `info` to confirm the file is a Zova database and inspect format identity. `stats` summarizes bounded storage counts. `tables` lists application-facing relational structure without making private schemas a public API.

JSON output includes `cli_json_version = 1`. Automation should consume JSON rather than parse human-readable tables.

## Inspect objects

```sh
zova objects app.zova
zova object app.zova <object-id-hex>
zova chunks app.zova
zova chunk app.zova <chunk-id-hex>
```

Object inspection reports identities, sizes, and manifest information without dumping content bytes. Use application APIs to read actual content under the application's authorization policy.

## Inspect vectors

```sh
zova vectors app.zova
zova vector-collection app.zova chunks
```

Vector inspection reports collection configuration and bounded metadata, not numeric vector values. Use a binding or SQL-native search to query rankings.

## Inspect graphs

```sh
zova graphs app.zova
zova graph app.zova default
zova graph-node app.zova default message:123
zova graph-neighbors --limit 20 app.zova default message:123
zova graph-walk --max-depth 2 --limit 50 app.zova default message:123
```

Neighbor and walk commands require explicit practical bounds. Node IDs may still reveal application identity, so treat exported reports according to your data policy.

## Check health

```sh
zova check app.zova
zova check --deep app.zova
zova doctor app.zova
zova doctor --json app.zova
```

Use deep checks after migrations, store changes, extension changes, and restored backups. `doctor` explains findings and suggested actions without modifying the source.

## Create safe copies

```sh
zova backup app.zova app.backup.zova
zova compact app.zova app.compact.zova
zova restore app.backup.zova app.restored.zova
```

Destinations must be new `.zova` paths. Backup uses SQLite's online backup API; compact creates a space-reclaiming copy; restore copies a backup into a fresh candidate.

With bound stores, these operations inline readable specialized data into a self-contained destination rather than recreating the external layout.

## Recover readable data

```sh
zova salvage --dry-run damaged.zova
zova salvage damaged.zova recovered.zova
```

Dry-run previews recoverability. Real salvage never mutates the source and refuses to overwrite the destination. A verified backup remains preferable; always deep-check the recovered candidate.

## Manage optional stores

Each store type supports create, bind, info, and unbind:

```sh
zova object-store create objects.zova
zova object-store bind main.zova objects.zova
zova object-store info main.zova
zova object-store unbind main.zova

zova vector-store create vectors.zova
zova vector-store bind main.zova vectors.zova
zova vector-store info main.zova
zova vector-store unbind main.zova

zova graph-store create graphs.zova
zova graph-store bind main.zova graphs.zova
zova graph-store info main.zova
zova graph-store unbind main.zova
```

Move existing private data with `split` rather than binding an empty store over it:

```sh
zova split --objects main.zova objects.zova
zova split --vectors main.zova vectors.zova
zova split --graphs main.zova graphs.zova
```

Back up before splitting. Read [Optional bound stores](../guides/bound-stores.md) for identity, movement, transaction, and recovery behavior.

## Manage extensions

Inspect and operate installed extensions:

```sh
zova extension list app.zova
zova extension info app.zova trgm
zova extension install app.zova trgm
zova extension check app.zova trgm
zova extension drop app.zova trgm
```

Verify and trust dynamic bundles separately:

```sh
zova extension verify --smoke ./my_ext.zovaext
zova extension trust ./my_ext.zovaext
zova extension trusted
zova --extension ./my_ext.zovaext extension install app.zova my_ext
zova extension untrust my_ext
```

Supplying `--extension` makes a trusted bundle available to that CLI process; it does not embed code into the database.

## Build extension bundles

```sh
zova extension scaffold ./sample_ext --name sample_ext --version 0.1.0
zova extension build ./sample_ext
zova extension pack ./sample_ext --out ./sample_ext.zovaext
zova extension verify --smoke ./sample_ext.zovaext
```

This producer workflow is experimental in v0.26.1. Native extensions are trusted in-process code and require platform- and ABI-compatible builds.

## Output and privacy contract

Human and JSON output avoid object and chunk bytes, vector values, extension-indexed text, private schema SQL, and arbitrary user rows. Counts and identities are still operational data; protect reports accordingly.

Use binding APIs for application reads and writes. The CLI is an operational surface, not a subprocess-based substitute for a language binding.
