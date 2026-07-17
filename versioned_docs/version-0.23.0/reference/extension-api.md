# Extension reference

An extension combines a validated manifest, process-provided native code, lifecycle hooks, and private tables under a reserved prefix. This page records the v0.23.0 bundle and host contract. Read the [Extensions guide](../guides/extensions.md) first for the trust model and deployment flow.

## Bundle layout

A dynamic bundle is a local directory ending in `.zovaext`:

```text
my_ext.zovaext/
  extension.json
  libmy_ext
```

The manifest names the platform-native library. The experimental builder uses `my_ext.dll` on Windows, `libmy_ext.dylib` on Apple platforms, and `libmy_ext.so` elsewhere.

The library path must be relative, must not contain `..`, and must remain inside the bundle. Loading runs native code with the same process privileges as the host application.

## Manifest

```json
{
  "name": "my_ext",
  "version": "0.1.0",
  "storage_prefix": "_zova_ext_my_ext_",
  "zova_abi_min": "0.23.0",
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

Because the ABI is pre-1.0, rebuild and test for every Zova minor release even when `zova_abi_min` is satisfied.

## Trust-store resolution

Trust records are stored at the first configured location:

1. `$ZOVA_TRUST_STORE` when set;
2. `$XDG_CONFIG_HOME/zova/trusted_extensions.json`; or
3. `$HOME/.config/zova/trusted_extensions.json`.

A record contains the canonical path, extension identity, manifest hash, library hash, and trust timestamp. A content or path change requires a new trust decision.

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

If the hook leaves `_zova_ext_<name>_*` objects behind, drop fails and the metadata remains installed. Update, enable, disable, and optional-installed extension states are not part of v0.23.0.

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
        .zova_abi_min = "0.23.0",
        .capabilities = "sql",
    },
    .install = install,
    .check = check,
    .drop = drop,
    .register_sql = registerSql,
};
```

The CLI scaffold/build/pack flow produces the expected project and bundle shape. High-level Rust, Go, and Python authoring APIs are deferred.

## C ABI host surface

The low-level ABI includes bundle verification, trust/untrust operations, and database open/create variants that receive explicit trusted bundle paths. Loaded libraries remain alive until the database handle closes.

The C ABI also supports controlled scalar SQL callbacks. Callback arguments are borrowed for the call, result bytes are copied, and callbacks must not re-enter the same database handle.

Generated-C package snapshots retain source-compatible symbols but cannot dynamically load external bundles under Zig 0.16. Use a native Zig-built C ABI or CLI artifact for external `.zovaext` hosting.

## Current non-goals

The v0.23 contract does not include aggregate or window callbacks, SQLite subtype support, unregister APIs, raw `sqlite3 *` exposure as the normal extension path, extension signing, optional installed extensions, or stable high-level authoring SDKs.
