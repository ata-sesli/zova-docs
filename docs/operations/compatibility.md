# Compatibility

Zova reports separate package, C ABI, SQLite, and storage-format versions. Changing one does not imply a change in the others.

| Version | Zova 1.4.0 |
|---|---|
| Package | `1.4.0` |
| C ABI | `1.4.0` |
| Vendored SQLite | `3.53.4` |
| Zova storage format | `13` |

## Storage promise

Every Zova 1.x release can migrate databases created by every earlier 1.x release. Format 9—the format written by released Zova 0.26.1—is the only pre-1.0 format guaranteed a migration into 1.x.

Zova 1.0.0 and 1.1.0 wrote format 11. Zova 1.2.0 introduced format 12 for transactional vector change tracking, and 1.3.0 kept it. Zova 1.4.0 introduced format 13, which adds a chunk-reference index for fast object deletion. Databases written by 1.3.0 need one explicit migration before 1.4.0 opens them.

| Source format | v1.4.0 classification | Action |
|---|---|---|
| 13 | current | open normally |
| 12 | migratable | explicitly migrate 12 → 13 |
| 11 | migratable | explicitly migrate 11 → 12 → 13 |
| 10 | migratable | explicitly migrate 10 → 11 → 12 → 13 |
| 9 | migratable | explicitly migrate 9 → 10 → 11 → 12 → 13 |
| 8 or older | unsupported legacy | export with a compatible older release |
| newer than 13 | unsupported future | use a compatible newer Zova release |

Opening a database never migrates it. Current files open; migratable files return `MigrationRequired`; legacy and future files return distinct errors. Each path leaves the source byte-identical.

## When features arrived

The tutorial, concept, guide, and binding pages describe current behavior. Use this table when an application must also run against an older release; the [release notes](../reference/release-notes-1.4.0.md) have the details.

| Feature | First release |
|---|---|
| Transactional KV storage and in-memory databases | 1.0.0 |
| Bundled SQLite modules in native builds, language packages, and WASM | 1.1.0 |
| Trusted `.zovaext` bundles in Rust, Python, Go, JavaScript, and generated-C packages | 1.2.0 |
| Common C plugin ABI v1 as the supported authoring contract, with negotiated host services | 1.2.0 |
| Operation-atomic object writes that join a caller-owned transaction | 1.2.0 |
| Rust transaction and savepoint closures that roll back on panic | 1.2.0 |
| WASM recovery of an abandoned rollback journal on open | 1.2.0 |
| Transactional vector change tracking (format 12) | 1.2.0 |
| Linked plugin descriptors; graph operations in the plugin data service | 1.3.0 |
| Incremental auto-vacuum for new files and in-place `reclaim` | 1.4.0 |
| Progress and cancellation for backup, compact, and migrate; status `ZOVA_INTERRUPTED` | 1.4.0 |
| Seekable object readers | 1.4.0 |
| Batched object writer commits and the chunk-reference index (format 13) | 1.4.0 |
| Full `migrate --dry-run` preflight; binding migration of databases with non-bundled extensions | 1.4.0 |
| C ABI `zova_vector_delete_many` and `zova_graph_edge_delete_many` | 0.24 |
| Adaptive top-k selection for large vector result sets | 0.24 |
| C ABI low-level graph publication: opaque keys, topology scans, edge payloads, prepared and fresh builds | 0.25 |

## Probe and migrate

Migration is offline and copy-forward. It writes a new destination and preserves the source:

```sh
zova format app.zova
zova migrate --dry-run app.zova app-format-13.zova
zova migrate app.zova app-format-13.zova
```

`zova format` reports the source format, current format, earliest migratable format, compatibility class, and recommended action. Add `--json` for automation. `zova migrate` verifies the destination by default; `--no-verify` skips that final reopen. On a terminal it shows a progress line; see [Progress and cancellation](./safety.md#progress-and-cancellation).

`--dry-run` runs the same classification, destination, bound-store, and extension checks as a real migration without creating or changing anything. It reports every file the migration would write, each member's page size, page count, and free-page count, the bytes the copy writes, the free space at the destination, and whether every installed extension is bundled or supplied with `--extension`. It exits `0` when the migration would pass those checks, and otherwise with the code the migration would return, naming the first failing check (for example `DestinationExists`, `ExtensionUnavailable`, or `InsufficientSpace`). With `--json`, the report is one object with `"dry_run": true` and `"status"` set to `"ok"` or `"would_fail"`.

Migration copies every page, free pages included. The current CLI cannot open an older file, so it cannot compact the source first; compact the migrated copy instead, which also switches it to incremental auto-vacuum. Treat the reported copy size as a lower bound; a dry run does not lock the source or run verification, so a real migration can still fail on a write or verification error.

Equivalent probe and migrate APIs are available through the C ABI, Rust, Python, Go, and JavaScript bindings. Keep a backup before migrating.

## Migration rules

- The destination main database and bound-store siblings must not exist.
- Bound stores migrate as one logical set and are published before the main database.
- Staging needs free space roughly equal to the source set and a filesystem that supports hard links.
- Migration takes an offline write lock while it plans and copies the source set.
- User SQL schema and rows, public identities, objects, vectors, graphs, extension records, store identities, and ordering are preserved.
- Extension-owned tables pass through unchanged and face normal extension validation when the destination opens.
- Plain migration refuses a database whose installed extensions are not bundled with Zova, and publishes nothing. The C ABI's `zova_database_migrate_with_extensions` accepts the same trusted bundle paths and linked plugin descriptors as open, and the bindings accept the same bundle paths and trust store as their open calls: `migrate_database_with_extensions` in Rust, `MigrateDatabaseWithExtensions` in Go, `extension_bundles` and `trust_store_path` on Python's `migrate_database`, and an `extensions` argument to JavaScript `migrateDatabase`. Linked plugin descriptors remain a C ABI feature.
- Migration keeps the source file's SQLite auto-vacuum mode. A migrated file therefore stays in `none` mode; run `zova compact` and use the compacted copy to switch it to incremental mode for [in-place reclaim](./safety.md#reclaim-free-pages-in-place).
- Downgrade migration is unsupported.

An interrupted run can leave destination reservations, published bound stores, and a `<destination>.migration-recovery/` directory. Stop every process using those paths, keep the destination and recovery directory together, then run the matching release's ownership-checking recovery script:

```sh
python3 scripts/recover-migration.py /path/to/app-format-13.zova
```

On Windows, use `python` if `python3` is unavailable. The script removes only outputs proven to belong to that migration. If it refuses, preserve the files and investigate—do not force-delete or hand-publish staged files.

## Keep artifacts aligned

Use the package, C header, static library, CLI, generated-C companion, and extensions from the same release. Go requires a matching C ABI archive. Native and generated-C artifacts both load trusted dynamic extensions on Linux, macOS, and Windows. A bundle must match the host's OS, CPU, deployment target, and runtime ABI.

Read the [v1.4.0 release notes](../reference/release-notes-1.4.0.md) and the [API stability contract](./api-stability.md) before upgrading production applications.
