# Zova v0.24.0

Zova 0.24.0 is the format-8 storage-optimization release. It reduces private graph and vector storage, speeds ingestion and large exact searches, enables SQLite storage diagnostics, and adds atomic C batch deletion for vectors and graph edges.

:::danger[New database required]
Zova 0.24.0 does not migrate format-7 databases in place. Keep the original database and a 0.23.x application or export with 0.23.x, then import the data into a newly created format-8 database. Zova 0.23.x cannot open format-8 files.
:::

## File format 8

Graphs and vectors now use compact private integer keys. Vector norms are stored beside vector values, and graph edge batches resolve endpoints once. These changes do not alter public graph names, node IDs, vector IDs, distance values, deterministic ordering, or documented error behavior.

The private schema is not an SQL compatibility surface. Applications must continue to use Zova's binding APIs and documented SQL functions or virtual tables instead of querying `_zova_*` tables directly.

## Storage and ingestion improvements

The retained deterministic storage benchmark reported these changes relative to format 7:

- 42.9% less graph storage;
- 6.9% less vector storage;
- a 37% graph-ingestion improvement; and
- a 45% vector-ingestion improvement.

Benchmark results describe the retained workload, not a guarantee for every database or machine. Measure representative application data before using the numbers for capacity planning.

## Exact vector search

Search remains an exact flat scan rather than an approximate nearest-neighbor index. v0.24 uses adaptive top-k selection for larger searches while preserving exact distances and deterministic ranking. Candidate filters, inclusive distance thresholds, search by ID, and typed `f32`, raw `f16`, and raw `i8` collections keep their public behavior.

## Graph integrity

Format-8 database handles enable SQLite foreign-key enforcement so private graph endpoint constraints and deletion cascades are active. Foreign keys in application-owned tables on the same connection are enforced as well; applications that declared constraints but previously relied on them being disabled must fix invalid writes before upgrading.

## Atomic C batch deletion

The C ABI adds:

- `zova_vector_delete_many` for vector IDs within one collection; and
- `zova_graph_edge_delete_many` for exact graph edge tuples.

Each call validates its complete input before mutation, joins an active Zova transaction when present, and otherwise executes in one Zova-owned transaction. Missing vectors and edges are ignored, making successful deletions idempotent. Use the v0.24 header and static library together.

## SQLite dbstat

Zova's bundled SQLite now enables the read-only `dbstat` virtual table. It can report page usage by table or index for storage diagnostics. `dbstat` availability is specific to Zova's bundled SQLite and is not guaranteed when a database is opened by an unrelated system SQLite build.

## Before upgrading

1. Keep the format-7 source database and a working 0.23.x application.
2. Export application-owned records and specialized data with 0.23.x.
3. Upgrade application packages, CLI artifacts, headers, and native libraries to 0.24.0 together.
4. Create a new format-8 database and import the exported data.
5. Run `zova check --deep`, then exercise application reads, writes, foreign-key behavior, backup, and restore.
6. Rebuild and smoke-test native extensions against the v0.24 ABI.
7. Retain the old application and format-7 data until the new database is verified.

Downloads and artifact checksums are available from the [GitHub v0.24.0 release](https://github.com/ata-sesli/zova/releases/tag/v0.24.0). The [v0.23.0 release notes](./release-notes-0.23.md) remain available for the previous format boundary.
