# Zova v0.25.0

Zova 0.25.0 introduces file format 9, a native graph layout with opaque topology keys, edge payloads, and atomic fresh-build APIs for high-throughput local publication while preserving the existing public graph model.

:::danger[New database required]
Zova does not migrate format-8 databases in place. Keep the original database and a compatible 0.24 application, export the data, then import it into a newly created format-9 database. Zova 0.24 cannot open format-9 files.
:::

## Format-9 graph layout

Authoritative graph rows and adjacency indexes now refer to edge types through a private dictionary instead of repeating edge-type text. Public APIs still accept and return edge-type strings.

Format 9 can store one opaque payload BLOB on each authoritative edge without duplicating payload bytes into adjacency indexes. Payloads are available through additive low-level batch lookup, replacement, and prepared construction APIs.

## Opaque topology keys

The C ABI and raw `zova-sys` add:

- opaque node and edge key mutation and lookup;
- keyed neighbor and degree queries;
- paged topology scans;
- prepared keyed graph builds with ordinal endpoints;
- payload-aware prepared graph construction; and
- atomic fresh-build sessions for predeclared table, FTS, graph, and vector targets.

Opaque keys are database-local row identities. They are not portable public IDs and become invalid when their rows or an unfinished transaction or fresh-build session rolls back.

## Publication performance

Fresh graph publication reduces repeated endpoint work through endpoint deduplication, dense slots, bounded prepared loading, deferred index construction, and scoped SQLite cache tuning. The release adds keyed-graph, fresh-build, and ablation benchmarks to keep those tradeoffs measurable.

The established graph CRUD, traversal, ordering, names, node IDs, edge types, incremental APIs, and bound graph-store routing remain compatible. The safe Rust, Python, and Go bindings do not expose the new publication surfaces in this release.

## Before upgrading

1. Keep the format-8 source and a working 0.24 application.
2. Export application-owned and specialized data with the format-8 build.
3. Upgrade application packages, headers, native libraries, and extensions together.
4. Create a new format-9 database and import the export.
5. Run `zova check --deep`, then verify application reads, writes, backup, and restore.

See the [full v0.24.0 to v0.25.0 changelog](https://github.com/ata-sesli/zova/compare/v0.24.0...v0.25.0).
