# Zova v1.2.0

Zova 1.2.0 makes trusted extensions practical in every native distribution. It adds a common C plugin ABI with negotiated host services, `.zovaext` loading in generated-C builds and the high-level bindings, and transactional vector change tracking. Storage moves to format 12 through an explicit migration. The experimental browser package grows from SQL and KV to objects, vectors, and graphs.

## Changes since v1.1.0

- The portable plugin ABI negotiates host services: bounded data access, private SQL storage, scalar and streaming SQL operations, diagnostics, and a snapshot-consistent vector history service. Zig helpers use the same C layouts. See [Host services](./extension-api.md#host-services).
- Format 12 adds transactional vector change tracking. Each vector source records its revisions in the same transaction as the write, so maintenance extensions reconcile against an exact snapshot.
- Generated-C builds load trusted `.zovaext` bundles on Linux, macOS, and Windows. Rust, Python, Go, and JavaScript select bundles explicitly at create/open. Opening never grants trust or loads paths from database metadata. See [Load bundles from an application](../guides/extensions.md#load-bundles-from-an-application).
- Extension code compatibility is separate from stored-data compatibility, and the plugin lifecycle has explicit cleanup and recovery paths.
- Two experimental [reference extensions](../guides/extensions.md#reference-extensions) are built only on the public plugin ABI: NetworKit PageRank and a persistent, incrementally maintained USearch HNSW index.
- Synchronous object writes, deletes, chunk writes, and assembly are operation-atomic and join a caller-owned transaction. See [Objects and transactions](../core/objects.md#objects-and-transactions).
- Tracked vector writes are cheaper: single-row writes reuse prepared statements, and history retirement moved into a guarded trigger that runs only at retirement points.
- Shared Rust handles roll transactions back when the closure panics, and handle retirement is enforced under the connection lock.
- C ABI archives bundle the native compiler runtime and are verified with system linkers, including GNU- and MSVC-matched Windows builds.
- The experimental [`zova-wasm`](../bindings/wasm.md) package adds transactions, prepared statements, export and import of persistent databases, and object, exact-vector, and graph helpers. It also recovers interrupted transactions when a persistent database is reopened.
- Source builds use Zig 0.17.0.

## Compatibility

Package and C ABI identity are `1.2.0`. Storage format is 12. Format-11 databases are reported as migration-required and left byte-identical on open; migrate them explicitly with `zova migrate` or the migration API in each binding, after taking a backup. Formats 9 and 10 keep their copy-forward path, now to format 12. Downgrades are unsupported. Existing 1.x ownership, ordering, error, and transaction guarantees remain in force.

Published 1.1.0 packages do not gain generated-C or binding-level bundle loading retroactively.

## Distribution

Native packages use `1.2.0` across Cargo, PyPI, npm, and Go. npm publishes `zova-js`, its native companions, and the experimental `zova-wasm` package. The Go module tag is `bindings/go/v1.2.0`.

Core vector search remains exact; approximate search is available only through the experimental USearch reference extension. Notifications remain same-process events. Extension authoring beyond the common C ABI, the reference extensions, and the browser WASM API remain experimental.

See the [full v1.1.0 to v1.2.0 changelog](https://github.com/ata-sesli/zova/compare/v1.1.0...v1.2.0).
