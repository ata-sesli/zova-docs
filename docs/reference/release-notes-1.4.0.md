# Zova v1.4.0

Zova 1.4.0 makes large objects and database maintenance practical at scale. Object writes, reads, and deletes are much faster, a seekable reader serves range requests, and deleted data can be returned to the filesystem in place. Long backups, compactions, and migrations report progress and can be cancelled. Storage moves to format 13, so databases written by 1.3.0 need one explicit `zova migrate` before 1.4.0 opens them.

## Changes since v1.3.0

### Objects

- `ObjectWriter` hashes each chunk once, inserts chunks in batches, and commits every 64 MiB instead of once per write call; `finish` no longer re-reads stored chunks. A 32 MiB FastCDC object written in 1 MiB calls went from about 2.6 s to about 0.3 s in a local probe.
- Object and chunk hashing selects hardware SHA-256 (ARMv8 SHA-2 or x86 SHA-NI) at run time, including in the Rust, Python, JavaScript, and Go packages built from generated C. Digests are unchanged.
- Full-object reads hash each byte once, and FastCDC range reads find their first chunk by binary search.
- Format 13 adds a chunk-reference index, so deleting objects no longer scans every manifest row. Deleting a 64 MiB FastCDC object from a store with 1M manifest rows went from about 12 minutes to 0.11 s.
- A seekable, verified object reader serves range requests: an `io.ReadSeeker` in Go, `Read + Seek` readers in Rust, a file-like object in Python, sync and async readers in JavaScript, and `zova_object_seekable_reader_*` in the C ABI. See [Seek through a large object](../core/objects.md#seek-through-a-large-object).
- Fixed a crash when `ObjectReader` failed to load its first chunk; it now returns `ObjectCorrupt`.

### Reclaiming disk space

- New databases, split stores, and `zova compact` output use SQLite incremental auto-vacuum.
- `zova reclaim [--json] [--max-pages <n>]`, `reclaim_space` (Rust and Python), `ReclaimSpace` (Go), `reclaimSpace` (JavaScript), `Database.reclaimSpace` (Zig), and `zova_database_reclaim` (C) release free pages in bounded steps without rewriting the database. See [Reclaim free pages in place](../operations/safety.md#reclaim-free-pages-in-place).
- Migrate, backup, restore, and conversion keep the source file's auto-vacuum mode. Files created before 1.4.0 keep reclaiming space through `zova compact`.

### Maintenance

- Backup, compact, and migrate report progress through an optional callback in every binding and through `zova_database_backup_with_progress`, `zova_database_compact_with_progress`, and `zova_database_migrate_with_progress`. Cancelling from the callback fails the operation with the new `ZOVA_INTERRUPTED` status and publishes nothing. See [Progress and cancellation](../operations/safety.md#progress-and-cancellation).
- The CLI shows a live progress line on a terminal; `--progress` prints plain lines and `--json --progress` writes line-delimited JSON events to stderr.
- `zova migrate --dry-run` reports the planned files, page and byte counts, destination free space, and whether every installed extension is available, without creating or changing anything.
- The Rust, Go, Python, and JavaScript bindings migrate databases with non-bundled extensions installed, using the same bundle paths and trust store as their open calls.
- Copy verification during backup, compact, restore, migrate, and split streams each object through a fixed buffer. Peak memory for a backup holding a 512 MiB object dropped from about 551 MB to about 12 MB.
- Fixed copy verification rejecting every database that held a streaming-profile object as corrupt.

### Graphs

- Keyed graph puts of up to 256 distinct keys resolve existing nodes and edges with point lookups, so small batches into a large graph no longer cost time proportional to the graph.

## Compatibility

Package and C ABI identity are `1.4.0`. The C ABI change is additive; code built against 1.3.0 keeps working. Code that switches over every `zova_status` value should handle `ZOVA_INTERRUPTED` (18).

Storage format is 13. Opening never migrates: format 9, 10, 11, and 12 databases are reported as migration-required and left unchanged. Migrate them with `zova migrate` or the migration call in any binding, after taking a backup. Zova 1.3.0 and earlier cannot open format-13 files, and downgrades are unsupported. See [Compatibility](../operations/compatibility.md).

The plugin ABI stays at v1, with no new plugin operations. Existing 1.x ownership, ordering, error, and transaction guarantees remain in force.

## Distribution

Native packages use `1.4.0` across Cargo, PyPI, npm, and Go. Python publishes CPython 3.13 stable-ABI wheels tested on 3.13 and 3.14. npm publishes `zova-js`, its native companions, and the experimental `zova-wasm` package. The Go module tag is `bindings/go/v1.4.0`.

On macOS, the first large write into a nearly empty incremental-mode file can take longer to commit: about 5% on an internal disk and about 60–75% on an external disk. A seekable or partial range read verifies each chunk it returns, not the whole-object hash. Linked plugin descriptors remain available only through the C ABI and Zig. Core vector search remains exact. Extension authoring beyond the common C ABI, the reference extensions, and the browser WASM API remain experimental.

See the [full v1.3.0 to v1.4.0 changelog](https://github.com/ata-sesli/zova/compare/v1.3.0...v1.4.0).
