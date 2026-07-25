# Zig

The Zig API is Zova's native and widest integration surface. It exposes the database facade, the public thin SQLite wrapper, store-management operations, extension registry integration, and native build paths that are intentionally not all mirrored by higher-level bindings.

## Import and create

```zig
const zova = @import("zova");

var db = try zova.Database.create("app.zova");
defer db.deinit();

try db.exec(
    "create table notes(" ++
        "id integer primary key, " ++
        "body text not null)",
);
```

Zova development targets Zig 0.16.0 or newer. Build scripts should pin a compatible Zig version because the project and extension host rely on native toolchain behavior beyond the stable C ABI.

## Resource and error discipline

Use `defer` or `errdefer` immediately after acquiring databases, statements, allocated result lists, listeners, and writers. Zig error unions preserve specific failure paths; propagate or handle them rather than translating every error into a generic boolean.

SQLite-owned column memory and callback-borrowed values have limited lifetimes. Copy data when it must outlive the current step or callback. Do not retain private table names or raw SQLite handles as an alternate public API.

## Native-only capabilities

The Zig layer includes the widest current surface:

- create, bind, inspect, split, and unbind optional stores;
- register application-provided extensions in the process registry;
- load explicitly trusted local extension bundles;
- use opaque graph keys, edge payloads, prepared keyed graph builds, topology scans, and atomic fresh-build sessions;
- build extension bridges against native APIs; and
- access low-level profiling and debugging paths intended for Zova development.

Not every native symbol is a stable cross-language contract. Use the C ABI when another language needs a versioned binary boundary.

## Extensions

Extension authors currently use native Zig for the complete manifest-and-hook model. Treat the extension ABI as pre-1.0: build for the target platform, declare `zova_abi_min`, and rebuild and test for each Zova minor release.

The CLI's scaffold/build/pack workflow is the easiest starting point; read [Extensions](../guides/extensions.md) before writing lifecycle or SQL registration hooks.
