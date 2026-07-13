# Rust

The `zova` crate is the normal safe interface. `zova-sys` exposes the raw C ABI and is intended for lower-level integration work.

## Open and ownership

```rust
use zova::Database;

let mut db = Database::create("app.zova")?;
db.exec("create table settings(key text primary key, value text)")?;
```

`Database` suits single-owner code. `SharedDatabase` is an opt-in cloneable `Send + Sync` handle whose calls are internally serialized. Open multiple database handles when the application needs genuine SQLite concurrency.

## Coverage

The safe crate exposes prepared statements, transactions, savepoints, backup/compact/restore, app events, objects and `ObjectWriter`, vectors, graphs, SQL-native helpers, and bundled extension lifecycle operations.

Object, vector, and graph APIs route transparently after a bound store is opened. Store create/bind/split/unbind management remains native Zig and CLI-only in v0.23.

## Build behavior

crates.io packages compile a bundled generated-C snapshot, so consumers need Rust 1.79+ and a C compiler, not Zig. External dynamic extension bundle loading requires a native Zig-built artifact; see [extensions](../guides/extensions.md).

