# Operational safety

Zova's file operations favor new destinations over in-place mutation. Backup, compact, restore, conversion, and salvage refuse to overwrite an existing path, making the source and rollback artifact explicit.

Operational safety still depends on application choices: where copies live, how often they are verified, which journal mode is used, and whether the entire required file set is included.

## Backup, compact, and restore solve different problems

```sh
zova backup app.zova app.backup.zova
zova compact app.zova app.compact.zova
zova reclaim app.zova
zova restore app.backup.zova app.restored.zova
```

| Operation | Mechanism | Use it for |
|---|---|---|
| `backup` | SQLite online backup API | a consistent operational snapshot |
| `compact` | SQLite `VACUUM INTO` | a verified copy that reclaims unused pages |
| `reclaim` | SQLite incremental vacuum, in place | returning free pages to the filesystem without a copy |
| `restore` | copy backup into a new destination | recovery without overwriting either artifact |

Backup does not promise the smallest possible file. Compact is not a substitute for backup history. Restore does not overwrite a damaged database in place; it produces a separate candidate that can be checked before cutover.

## Reclaim free pages in place

Since 1.4.0, files Zova creates, the stores that `split` creates, and every member of `compact` output use SQLite incremental auto-vacuum. Zova never vacuums automatically: deleted pages stay on the freelist until you release them.

```sh
zova reclaim app.zova
zova reclaim --max-pages 100000 --json app.zova
```

`reclaim` releases free pages from the main database and every bound store in incremental mode. Each step is its own short write transaction of at most 1024 pages, so readers and writers are blocked only between steps; `--max-pages` caps the total for one run. The report lists, per member, the auto-vacuum mode, page size, pages and bytes released, and free pages left. Reclaim changes no logical data.

| Operation | Resulting auto-vacuum mode |
|---|---|
| create a database or store, `split` | incremental |
| `compact` (each member) | incremental |
| `migrate`, `backup`, `restore`, SQLite conversion | unchanged from the source |

A member in `none` mode, which includes every database migrated from an earlier format, releases nothing; `reclaim` points it at `compact`. Run `zova compact` once and use the compacted copy to switch the file to incremental mode.

The bindings expose the same operation as `reclaim_space` (Rust and Python), `ReclaimSpace` (Go), and `reclaimSpace` (JavaScript, sync and async); Zig uses `Database.reclaimSpace` and the C ABI `zova_database_reclaim`. Each returns one entry per member file. Calling it inside an open transaction fails.

## Progress and cancellation

Since 1.4.0, `backup`, `compact`, and `migrate` report progress. On a terminal, the CLI shows one progress line on stderr; `--progress` writes plain progress lines when stderr is not a terminal; and `--json --progress` writes one JSON event per line to stderr while the final result object stays on stdout:

```json
{"cli_json_version":1,"event":"progress","command":"migrate","phase":"copy","member":"main","done":1024,"total":4113}
```

| Phase | Member | Unit |
|---|---|---|
| `copy` | `main`, `object_store`, `vector_store`, `graph_store` | SQLite pages of the source member |
| `migrate` | as for `copy` | format migration steps |
| `verify` | `null` (whole set) | stored objects, chunks, vectors, and KV entries |
| `publish` | `null` (whole set) | member files, bound stores first |

Output is throttled to whole-percent changes. `compact` runs `VACUUM INTO` as one statement, so its main copy reports only its start and end.

Applications pass a progress callback and cancel from it:

| Binding | Backup and compact | Migrate | Cancel |
|---|---|---|---|
| Rust | `backup_to_with_progress`, `compact_to_with_progress` | `migrate_database_with_progress` | return `ControlFlow::Break(())` |
| Go | `BackupToWithProgress`, `CompactToWithProgress` | `MigrateDatabaseWithProgress` | return an error |
| Python | `progress=` on `backup_to`, `compact_to` | `progress=` on `migrate_database` | raise; the exception is re-raised |
| JavaScript | `{ progress, signal }` on `AsyncDatabase.backupTo`, `compactTo` | `{ progress, signal }` on `AsyncDatabase.migrateDatabase` | abort the `AbortSignal` or throw |
| C | `zova_database_backup_with_progress`, `zova_database_compact_with_progress` | `zova_database_migrate_with_progress` | return non-zero |

A cancelled operation fails with `ZOVA_INTERRUPTED` (the binding's equivalent error) and publishes nothing: a cancelled migration leaves the source unchanged and creates no destination files, and a cancelled backup or compaction removes its destination.

## Verify a recovery path, not just a file

A backup is useful only if your application can recover from it. Regularly test:

```sh
zova restore app.backup.zova restore-test.zova
zova check --deep restore-test.zova
zova info restore-test.zova
```

Then open `restore-test.zova` with the same application version and exercise representative reads. If extensions are required, make their code available during verification. If a release changes file format, keep a binary that can still open the backup.

Store important backups on a different failure domain. A second file on the same failing disk is not sufficient protection.

## Bound-store copies become self-contained

When a main database has optional bound object, vector, or graph stores, backup, compact, and restore copy readable specialized data into the destination file. The result is one self-contained `.zova` database without bound-store rows.

This behavior makes recovery portable, but it may require enough free space for all attached data. The output does not preserve the original multi-file placement. Split it again only after the restored single-file database has been validated.

## Transactions protect logical operations

Use explicit transactions when related changes must be accepted together. Savepoints offer partial rollback inside a transaction, but they are not independent commits.

With bound stores, SQLite `ATTACH` and journal-mode rules determine crash atomicity across files. Zova does not silently change journal mode or claim stronger guarantees. Test the actual deployment configuration if a cross-file transaction is critical.

## Prepare risky changes

Before a format upgrade, split, migration, extension change, or large deletion:

1. Make a new backup.
2. Restore and deep-check it.
3. Record the Zova version and required extension artifacts.
4. Estimate destination disk space; for a migration, run `zova migrate --dry-run` first.
5. Define which paths the application will use after success.
6. Define the rollback condition before starting.
7. Run `zova check --deep` after the change.

Do not use salvage as a routine migration tool. It is a best-effort recovery path for readable validated data; a known-good backup is preferable.

## Production checklist

- Keep versioned backups outside the primary failure domain.
- Test restoration on a schedule.
- Run deep diagnostics before and after risky local migrations.
- Never edit `_zova_*` tables or bound-store markers directly.
- Keep application metadata and specialized references consistent through explicit workflows.
- Document required bound files and extensions with the application release.
- Monitor free space before backup, compact, restore, split, and salvage.
- Keep storage-format compatibility and copy-forward migration boundaries in the rollback plan.

Continue with [Diagnostics and salvage](./diagnostics.md) for inspection and degraded-data recovery.
