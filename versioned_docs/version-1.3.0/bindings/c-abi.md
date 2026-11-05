# C ABI

The C ABI is Zova's language-neutral integration boundary. Use it from C, Go, or another language that can call a static native library. Include the `zova.h` and link the matching `libzova_c.a` from the same release archive.

## Handle-based design

Database, statement, object writer, listener, and result values use opaque handles. Callers do not depend on Zig struct layouts or reach into SQLite internals.

Functions return `zova_status`. On failure, retrieve the documented error information before performing another operation that may replace handle-local diagnostics. Never infer success from a non-null output when the status reports an error.

Request structs use explicit fields and lengths rather than C string assumptions where binary or borrowed data is involved. Fixed-width types keep IDs and numeric layout predictable across callers.

## Ownership is part of the API

The header documents whether input is borrowed, output is caller-provided, or a returned allocation is owned by Zova. Lists, buffers, object manifests, vectors, graph results, and diagnostic outputs must be released with their matching `zova_*_free` function.

Do not use the C runtime's `free` on Zova-owned memory and do not retain borrowed callback arguments after the callback returns. Pair every successful handle creation with its documented close or free operation, including failure paths after later setup steps.

## Concurrency

Calls through one database handle are internally serialized. This protects the handle; it does not create parallel SQLite execution. Use multiple database handles when the host needs concurrent database work and account for SQLite locking between them.

Avoid holding application locks across Zova calls unless lock ordering is defined, especially when callbacks can re-enter application code.

## Scalar SQL callbacks

The v1.3.0 C ABI can register scalar SQL functions on Zova-owned connections. Callback arguments are borrowed only for the call, and Zova copies result bytes according to the result contract.

A callback must not re-enter the same `zova_database` handle. Re-entry can violate serialization and SQLite callback assumptions. If a callback needs external state, provide it through the documented user-data lifetime rather than global mutable state.

## Extensions and artifact choice

C ABI artifacts can verify, trust, supply, and load external `.zovaext` bundles with `zova_database_create_with_extensions` and `zova_database_open_with_extensions`. Since 1.2.0, generated-C builds include the same loader as native Zig builds on Linux, macOS, and Windows.

Since 1.3.0, a host that links plugin code into its own process can pass `zova_plugin_descriptor_v1` pointers to `zova_database_create_with_plugins`, `zova_database_open_with_plugins`, and `zova_database_open_for_extension_upgrade_with_plugins`, optionally together with trusted bundle paths. Linked descriptors need no bundle and no trust record. `zova_database_migrate_with_extensions` accepts the same bundles and descriptors for format migration. See the [Extension reference](../reference/extension-api.md#c-abi-host-surface).

The release header is the authoritative symbol and struct contract. Do not copy declarations from examples into a separate local header.

## Atomic batch deletion

v0.24 adds `zova_vector_delete_many` and `zova_graph_edge_delete_many`. Both validate the complete request before mutating storage, join an active Zova transaction when one exists, and otherwise run the batch in one Zova-owned transaction. Missing vectors or exact edges are ignored, so retrying a successfully applied deletion is safe.

The request arrays and their strings are borrowed only for the call. Use a matching header and static library together; headers older than v0.24 do not declare these additive ABI entry points.

## Low-level graph publication

The v0.25 C ABI added opaque node and edge keys, paged topology scans, edge payloads, prepared graph builds, and atomic fresh-build sessions. These are additive low-level publication APIs for applications that need high-throughput graph construction.

Opaque keys are database-local row identities, not portable application IDs. A key becomes invalid when its row is deleted or its transaction or unfinished fresh-build session rolls back. Public graph names, node IDs, edge-type strings, traversal ordering, and incremental graph APIs remain the stable application-facing model.

The advanced graph surfaces are also declared by raw `zova-sys`. They are stable low-level 1.x contracts and are deliberately not wrapped by the high-level JavaScript, Python, Go, or safe Rust APIs.
