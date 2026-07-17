# Rust

The `zova` crate is the normal safe Rust interface. It wraps database, statement, writer, listener, vector, graph, and operational results with owned Rust types and deterministic cleanup. `zova-sys` exposes the raw C ABI for lower-level integration.

## Install and open

```sh
cargo add zova@0.23.0
```

```rust
use zova::Database;

let mut db = Database::create("app.zova")?;
db.exec(
    "create table settings(\
       key text primary key,\
       value text not null\
     )",
)?;
```

Use `Database::create` for a new destination and `Database::open` for an existing Zova file. Open options support read-only handles. Zova does not install a nonzero SQLite busy timeout unless the application requests one.

## Choose the ownership model

`Database` suits single-owner code and exposes mutating operations through a mutable reference. `SharedDatabase` is a cloneable `Send + Sync` handle whose calls are serialized by an internal mutex.

Serialization makes one handle safe to share; it does not provide parallel SQLite calls. Open multiple database handles when true SQLite concurrency is required, then account for normal SQLite locking and configure a busy timeout deliberately.

Use `SharedDatabase::with_exclusive`, `transaction`, or `transaction_immediate` when a multi-call unit on the shared handle must not interleave with other callers.

## Work with statements

```rust
use zova::Step;

let mut insert = db.prepare(
    "insert into settings(key, value) values (?1, ?2)",
)?;
insert.bind_text(1, "theme")?;
insert.bind_text(2, "sage")?;
assert_eq!(insert.step()?, Step::Done);
drop(insert);

let mut query = db.prepare(
    "select value from settings where key = ?1",
)?;
query.bind_text(1, "theme")?;
assert_eq!(query.step()?, Step::Row);
assert_eq!(query.column_text(0)?, Some("sage"));
```

Dropping statements and result owners releases their native resources. Do not try to use a database mutably while a statement still holds the corresponding borrow; finish or drop the statement first.

## Transactions and scoped work

The crate exposes transactions, immediate transactions, named savepoints, and closure-based savepoint helpers. On a shared handle, scoped guards keep the mutex for the complete unit so another clone cannot interleave calls in the middle.

Use the transaction APIs rather than issuing raw transaction SQL when app events or Zova's transaction-aware behavior must track the scope.

## Specialized storage

The safe crate covers:

- complete and streaming objects, range reads, chunks, and assembly;
- typed vector collections, CRUD, batch writes, and exact search;
- graphs, nodes, edges, neighbors, and bounded walks;
- SQL-native vector and graph helpers through prepared statements;
- same-process app events; and
- backup, compact, restore, and bundled extension lifecycle.

After opening a main database with bound stores, the same object, vector, and graph methods route transparently. Creating, binding, splitting, and unbinding stores remains CLI/native Zig-only in v0.23.0.

## Native packaging and extensions

The crate builds a bundled generated-C snapshot, so consumers need Rust 1.79+ and a C compiler but not Zig. Bundled extensions such as `trgm` are available through safe lifecycle methods.

External dynamic bundle loading and scalar callback registration are exposed at the low-level `zova-sys` boundary, not as safe high-level APIs. Generated-C artifacts cannot portably load external `.zovaext` bundles; use a native Zig-built host for that deployment.

See [Build your first database](../get-started/first-database.md) for an end-to-end Rust example and the individual core chapters for storage semantics.
