# Zova v1.3.0

Zova 1.3.0 extends the plugin host for applications that link extension code directly. Plugins can read graph edge payloads and keyed adjacency through the data service, the C ABI accepts plugin descriptors already linked into the host process, and migration can take the same extension code as open. Storage stays at format 12, so databases written by 1.2.0 open unchanged.

## Changes since v1.2.0

- The plugin data service adds `ZOVA_PLUGIN_GRAPH_EDGE_PAYLOADS_GET`, which returns one row per requested edge key in input order with a found flag and payload. Payload bytes count toward the request's byte budget.
- The plugin data service adds `ZOVA_PLUGIN_GRAPH_NEIGHBORS_KEYED`, which reads the adjacency of a batch of node keys in one request, with a direction and optional edge-type filter. Rows are grouped by input key and pages resume from the last row.
- The C ABI adds `zova_database_create_with_plugins`, `zova_database_open_with_plugins`, and `zova_database_open_for_extension_upgrade_with_plugins`. They take `zova_plugin_descriptor_v1` pointers linked into the host process, optionally with trusted `.zovaext` bundle paths. Linked descriptors need no bundle and no trust record. See [C ABI host surface](./extension-api.md#c-abi-host-surface).
- The C ABI adds `zova_database_migrate_with_extensions` for databases whose installed extensions are not bundled with Zova. Plain `zova_database_migrate` still refuses such a database and publishes nothing.
- Fixed migration of a WAL-mode source leaving `<destination>.migration-recovery/` behind with empty `-wal` and `-shm` files. The migrated database was already complete.
- Fixed keyed degree batches (`zova_graph_degree_many_keyed` and the bindings over it) taking time quadratic in the batch size. A batch of 12,600 keys went from seconds to milliseconds. The slowdown was present since 1.1.0.
- A plugin's read-only operations may query application tables in `main` through the query service; this is now documented and tested.
- `zova-sys` declares the new functions and request structs. The safe Rust, Python, Go, and JavaScript APIs are unchanged.

## Compatibility

Package and C ABI identity are `1.3.0`. The C ABI change is additive; code built against 1.2.0 keeps working. Storage format remains 12, so no migration is needed from 1.2.0. Formats 9, 10, and 11 keep their explicit migration path to format 12. Downgrades are unsupported.

The plugin ABI stays at v1. A plugin that uses `ZOVA_PLUGIN_GRAPH_EDGE_PAYLOADS_GET` or `ZOVA_PLUGIN_GRAPH_NEIGHBORS_KEYED` must declare `zova_abi_min` `1.3.0`; a 1.2.0 host rejects those operations as invalid.

## Distribution

Native packages use `1.3.0` across Cargo, PyPI, npm, and Go. npm publishes `zova-js`, its native companions, and the experimental `zova-wasm` package. The Go module tag is `bindings/go/v1.3.0`.

A single edge payload larger than the 1 MiB data-service page budget cannot be read through the plugin data service. Linked plugin descriptors and extension-aware migration are available only through the C ABI and Zig. Core vector search remains exact. Extension authoring beyond the common C ABI, the reference extensions, and the browser WASM API remain experimental.

See the [full v1.2.0 to v1.3.0 changelog](https://github.com/ata-sesli/zova/compare/v1.2.0...v1.3.0).
