# Extension reference

An extension combines a validated manifest, process-provided native code, lifecycle hooks, and private tables under a reserved prefix. This page records the v1.3.0 bundle and host contract. Bundled lifecycle management and the common C plugin ABI v1 are supported surfaces; legacy Zig bundle production and the reference extensions remain experimental. Read the [Extensions guide](../guides/extensions.md) first for the trust model and deployment flow.

## Bundle layout

A dynamic bundle is a local directory ending in `.zovaext`:

```text
my_ext.zovaext/
  extension.json
  libmy_ext
```

The manifest names the platform-native library. The experimental builder uses `my_ext.dll` on Windows, `libmy_ext.dylib` on Apple platforms, and `libmy_ext.so` elsewhere.

The library path must be relative, must not contain `..` or native directory separators, and must remain inside the bundle. On Windows, sibling dependency DLLs inside the bundle resolve; the process current directory is never searched. Loading runs native code with the same process privileges as the host application.

## Manifest

```json
{
  "name": "my_ext",
  "version": "0.1.0",
  "storage_prefix": "_zova_ext_my_ext_",
  "zova_abi_min": "1.0.0",
  "capabilities": "sql",
  "library": "libmy_ext",
  "entrypoint": "zova_extension_entry"
}
```

| Field | Contract |
|---|---|
| `name` | ASCII, 1–64 bytes, outside reserved `_zova_` namespace |
| `version` | extension version text |
| `storage_prefix` | exactly `_zova_ext_<name>_` |
| `zova_abi_min` | canonical `major.minor.patch` minimum |
| `capabilities` | bounded capability description |
| `library` | relative in-bundle native library path |
| `entrypoint` | optional exported symbol; defaults to `zova_extension_entry` |

The host rejects duplicate names or storage prefixes, malformed installed rows, a different ABI major, or a minimum ABI newer than the host.

The host enforces the numeric 1.x ABI floor, but extension code is trusted native code and must still be tested on every supported platform and deployment artifact.

## Trust-store resolution

Trust records are stored at the first configured location:

1. `$ZOVA_TRUST_STORE` when set;
2. `$XDG_CONFIG_HOME/zova/trusted_extensions.json`; or
3. `$HOME/.config/zova/trusted_extensions.json`.

A record contains the canonical path, extension identity, manifest hash, library hash, a bundle-wide content hash covering every other bundle file, and the trust timestamp. A change to any bundle file or to the path requires a new trust decision.

```sh
zova extension trust ./my_ext.zovaext
zova extension trusted
zova extension untrust my_ext
```

Trusting does not load or install the extension. Opening with a bundle never trusts it automatically.

## Process registration and database installation

The process registry is fixed for the lifetime of a database handle. Close and reopen with a different bundle list to change available external extensions.

```sh
zova --extension ./my_ext.zovaext \
  extension install app.zova my_ext
```

After installation, the database records that `my_ext` is required. Later opens must provide matching process code. SQL functions from its `register_sql` hook are available on Zova-owned connections after install and on subsequent opens when the extension code is supplied.

## Install lifecycle

Install runs inside a lifecycle savepoint:

1. Validate the manifest and registry.
2. Run the install hook to create owned storage.
3. Record installed metadata.
4. Run optional SQL registration.
5. Audit private storage ownership.
6. Validate core private schema.
7. Release the savepoint.

Failure rolls back the savepoint so the database does not retain a partially installed extension.

## Check and open behavior

The check hook validates extension-owned invariants. Read-only opens still register connection-local SQL hooks and run extension checks; those paths must not write.

If SQL registration or extension validation fails during normal open, the database handle is not returned. Missing required code is an open error rather than a silently disabled feature.

## Drop lifecycle

Drop also runs inside a savepoint:

1. Validate installed metadata and matching process code.
2. Run the drop hook.
3. Remove installed metadata.
4. Audit that no owned private objects remain.
5. Validate core private schema.
6. Release the savepoint.

If the hook leaves `_zova_ext_<name>_*` objects behind, drop fails and the metadata remains installed. Enable, disable, and optional-installed extension states are not part of v1.3.0.

## Storage rules

An extension may create SQLite tables, indexes, views, and triggers only under its own prefix:

```text
_zova_ext_<name>_*
```

It must not claim or modify core storage such as `_zova_meta`, `_zova_objects`, `_zova_vectors`, `_zova_graphs`, or `_zova_extensions`. Unknown extension-prefixed objects without an installed owner appear in diagnostics.

Extension storage remains in the main database. It can refer to objects and vectors in bound stores through public target identities, but its private tables are not routed to those stores.

## Salvage hook

Core salvage never interprets extension-private tables. An optional trusted salvage hook may copy a valid subset, rebuild derived state, or skip storage. Without available code and a hook, private storage is skipped and reported; the destination is not falsely marked as containing a healthy installed extension.

## Native Zig authoring shape

```zig
const ext = zova.Extension{
    .manifest = .{
        .name = "my_ext",
        .version = "0.1.0",
        .storage_prefix = "_zova_ext_my_ext_",
        .zova_abi_min = "1.0.0",
        .capabilities = "sql",
    },
    .install = install,
    .check = check,
    .drop = drop,
    .register_sql = registerSql,
};
```

The CLI scaffold/build/pack flow produces the expected project and bundle shape. High-level Rust, Go, and Python authoring APIs are deferred.

## Explicit extension-data upgrades

Normal open requires the installed data-contract version to match the loaded manifest exactly; it never upgrades automatically. A loader-capable host can perform an explicitly declared, forward, single-step upgrade:

```sh
zova --extension ./new-plugin.zovaext extension upgrade app.zova my_plugin
```

The upgrade hook, target registration/checking, schema validation, and metadata publication run inside one savepoint. Failure rolls everything back. Downgrades, equal versions, undeclared steps, and automatic multi-hop path search are unsupported.

When both a Zova format migration and an extension-data upgrade are needed, migrate the database first with code matching the installed extension version, then run the extension upgrade against the migrated database.

Since 1.2.0, a portable plugin can instead declare that new code understands existing data. A descriptor flagged with `ZOVA_PLUGIN_HAS_DATA_COMPATIBILITY_V1` names its target data version and an exact list of accepted data versions, so a code-only update opens installed data without an upgrade hook or metadata writes. Code version and stored-data version are separate.

## Portable plugin ABI v1

`include/zova_plugin.h` defines the language-neutral authoring contract. A portable bundle selects `zova_plugin_entry_v1` in its manifest and returns a static `zova_plugin_descriptor_v1`. Since 1.2.0, this common C ABI is the supported authoring contract. Zig helpers use the same C layouts rather than a second ABI.

The ABI does not sandbox plugins: loading a library may execute native initializers. No allocation, C++ exception, or Rust panic may cross the boundary. Native and generated-C hosts load portable plugins on Linux, macOS, and Windows.

## Host services

Since 1.2.0, hooks can negotiate host services by ID, version, and minimum structure size. A plugin declares required services in its descriptor flags, so an older host rejects it before any hook runs. Optional services can be probed.

| Service | Purpose |
|---|---|
| Query | one parameterized read-only `SELECT`/`WITH` statement with typed row callbacks |
| Diagnostics | copy the current SQLite error into a bounded caller buffer |
| Data | graph node/edge scans, keyed batches, adjacency, and vector metadata, reads, and scans |
| Storage | parameterized reads and writes to the plugin's own `main._zova_ext_<name>_*` tables |
| Operations | register typed scalar or streaming table SQL operations |
| Vector maintenance | snapshot-visible vector revisions and bounded change history (format 12) |

Related calls in one hook share a host-owned savepoint with pinned main and bound-store snapshots. It joins a caller transaction, sees the caller's earlier writes, and never commits it. Plugins must not issue transaction commands or mutate authoritative data through SQL. A plugin's read-only operations may also query application tables in `main` through the query service.

Since 1.3.0, the data service adds two graph operations:

- `ZOVA_PLUGIN_GRAPH_EDGE_PAYLOADS_GET` takes a batch of edge keys and returns one row per key, in input order, with a found flag and the payload. Payload bytes count toward the request's byte budget.
- `ZOVA_PLUGIN_GRAPH_NEIGHBORS_KEYED` reads the adjacency of a batch of node keys in one request, with a direction and an optional edge type or set of edge types. Rows are grouped by input key and pages resume from the last row.

A plugin that uses either operation must declare `zova_abi_min` `1.3.0`; a 1.2.0 host rejects them as invalid.

Budgets bound delivery, not arbitrary native CPU or SQLite working memory:

| Service | Limits |
|---|---|
| Query and storage | 256 parameters, 128 columns, 4096 rows, 1 MiB each for SQL, input, and delivered bytes |
| Data | 4096 inputs or outputs, 1 MiB delivery per page |
| Operations | 32 arguments, 64 columns, 1 MiB input or individual row |
| Diagnostics | 1024 bytes |

A single edge payload larger than the 1 MiB page budget cannot be read through the data service. A limit or cancellation can follow rows already delivered, so discard partial output on failure.

## SQL operations

An operation's local name becomes `zova_<extension>_<operation>`:

```sql
select zova_example_score(?1);
select node_id, score from zova_example_rank(?1) order by score desc, node_id;
```

These are ordinary prepared statements in every binding. Scalar operations return one typed value; table operations stream rows through `open`, `next`, and `close`. Table operations are read-only. Scalar operations that write declare themselves mutating and may write only plugin-owned storage. Use SQL `ORDER BY` for result ordering.

## Vector change tracking

Format 12 records each vector source's revisions in the same transaction as the write. The vector maintenance service exposes an incarnation, revision, and branch token so a plugin can detect collection recreation, rollback, and divergence, and read bounded history. When history is unavailable, a plugin must rebuild from the current visible source or report an error, never treat it as an empty change set.

Private index data lives in the main file while a bound vector store may have its own WAL; this does not promise cross-file crash atomicity. Validate source coverage before reusing persisted index data after reopen or recovery.

## C ABI host surface

The low-level ABI includes bundle verification, trust/untrust operations, and database open/create variants that receive explicit trusted bundle paths. Loaded libraries remain alive until the database handle closes.

Since 1.3.0, a host that links plugin code into its own process can supply descriptors directly:

```c
#include "zova.h"
#include "zova_plugin.h"

extern const zova_plugin_descriptor_v1 my_plugin; /* defined by the host */

const zova_plugin_descriptor_v1 *plugins[] = { &my_plugin };
zova_database *db = NULL;
zova_database_open_plugins_request request = {
    .path = "app.zova",
    .plugins = plugins,
    .plugin_count = 1,
    .out_db = &db,
};
zova_status status = zova_database_open_with_plugins(&request);
```

`zova_database_create_with_plugins`, `zova_database_open_with_plugins`, and `zova_database_open_for_extension_upgrade_with_plugins` take the trusted-bundle request plus an array of descriptor pointers. Linked plugins compose with bundled extensions and any listed bundles, and the usual lifecycle calls then apply by name. Every descriptor and everything it points to must stay valid until the handle closes. No hash is recorded for linked code; the trust store is consulted only for bundle paths in the same request.

`zova_database_migrate_with_extensions` migrates a database whose installed extensions are not bundled with Zova, accepting the same bundle paths and linked descriptors as open. Plain `zova_database_migrate` still refuses such a database and publishes nothing.

These 1.3.0 functions are declared by raw `zova-sys` but not wrapped by the safe Rust, Python, Go, or JavaScript APIs.

The C ABI also supports controlled scalar SQL callbacks. Callback arguments are borrowed for the call, result bytes are copied, and callbacks must not re-enter the same database handle.

Since 1.2.0, generated-C package builds load external `.zovaext` bundles with the same loader as native Zig builds.

## Current non-goals

The v1.3.0 contract does not include aggregate or window callbacks, SQLite subtype support, unregister APIs, raw `sqlite3 *` exposure as the normal extension path, extension signing, optional installed extensions, or stable high-level authoring SDKs.
