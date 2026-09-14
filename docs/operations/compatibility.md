# Compatibility

Zova reports separate package, C ABI, SQLite, and storage-format versions. Changing one does not imply a change in the others.

| Version | Zova 1.0.0 |
|---|---|
| Package | `1.0.0` |
| C ABI | `1.0.0` |
| Vendored SQLite | `3.53.4` |
| Zova storage format | `11` |

## Storage promise

Every Zova 1.x release can migrate databases created by every earlier 1.x release. Format 9—the format written by released Zova 0.26.1—is the only pre-1.0 format guaranteed a migration into 1.0.

| Source format | v1.0.0 classification | Action |
|---|---|---|
| 11 | current | open normally |
| 10 | migratable | explicitly migrate 10 → 11 |
| 9 | migratable | explicitly migrate 9 → 10 → 11 |
| 8 or older | unsupported legacy | export with a compatible older release |
| newer than 11 | unsupported future | use a compatible newer Zova release |

Opening a database never migrates it. Current files open; migratable files return `MigrationRequired`; legacy and future files return distinct errors. Each path leaves the source byte-identical.

## Probe and migrate

Migration is offline and copy-forward. It writes a new destination and preserves the source:

```sh
zova format app.zova
zova migrate app.zova app-format-11.zova
```

`zova format` reports the source format, current format, earliest migratable format, compatibility class, and recommended action. Add `--json` for automation. `zova migrate` verifies the destination by default; `--no-verify` skips that final reopen.

Equivalent probe and migrate APIs are available through the C ABI, Rust, Python, Go, and JavaScript bindings.

## Migration rules

- The destination main database and bound-store siblings must not exist.
- Bound stores migrate as one logical set and are published before the main database.
- Staging needs free space roughly equal to the source set and a filesystem that supports hard links.
- Migration takes an offline write lock while it plans and copies the source set.
- User SQL schema and rows, public identities, objects, vectors, graphs, extension records, store identities, and ordering are preserved.
- Extension-owned tables pass through unchanged and face normal extension validation when the destination opens.
- Downgrade migration is unsupported.

An interrupted run can leave destination reservations, published bound stores, and a `<destination>.migration-recovery/` directory. Stop every process using those paths, keep the destination and recovery directory together, then run the matching release's ownership-checking recovery script:

```sh
python3 scripts/recover-migration.py /path/to/app-format-11.zova
```

On Windows, use `python` if `python3` is unavailable. The script removes only outputs proven to belong to that migration. If it refuses, preserve the files and investigate—do not force-delete or hand-publish staged files.

## Keep artifacts aligned

Use the package, C header, static library, CLI, generated-C companion, and extensions from the same release. Go requires a matching C ABI archive. Native Zig-built artifacts can host trusted dynamic extensions; generated-C package artifacts cannot dynamically load them.

Read the [v1.0.0 release notes](../reference/release-notes-1.0.0.md) and [API stability contract](./api-stability.md) before upgrading production applications.
