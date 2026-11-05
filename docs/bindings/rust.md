# Rust

The `zova` crate is the normal safe Rust interface. It wraps database, statement, writer, listener, vector, graph, and operational results with owned Rust types and deterministic cleanup. `zova-sys` exposes the raw C ABI for lower-level integration.

## Install and open

```sh
cargo add zova@1.4.0
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

## API at a glance

The [tutorial](../get-started/first-database.md) uses most of these calls in complete programs. Methods are on `zova::Database` unless a free function or type is named; `SharedDatabase` provides the same storage methods.

| Task | Calls | Tutorial |
|---|---|---|
| Create or open a database | `Database::create(path)`, `Database::open(path)`, `Database::open_with_options(path, options)`, `Database::create_memory()` | [part 1](../get-started/first-database.md) |
| Run SQL | `exec(sql)`; `prepare(sql)` returns a `Statement` that borrows the database until dropped | [part 1](../get-started/first-database.md) |
| Bind and read values | `bind_text`, `bind_i64`, `bind_f64`, `bind_blob`, `bind_null`; `step()` returns `Step::Row` or `Step::Done`; `column_text`, `column_i64`, `column_f64`, `column_blob` return `Option` values | [part 1](../get-started/first-database.md) |
| Group writes | `begin_immediate`, `commit`, `rollback`; `savepoint`, `rollback_to_savepoint`, `release_savepoint`, `with_savepoint`; `SharedDatabase::transaction` and `transaction_immediate` | [part 2](../tutorial/search.md) |
| Store and read bytes | `put_object(bytes)`, `get_object(id)`, `read_object_range`, `object_size(id)`, `delete_object(id)`; `ObjectId::try_from(&[u8])` | [part 1](../get-started/first-database.md) |
| Stream large objects | `object_writer()`; `object_seekable_reader(id)`, which implements `Read + Seek` | [guide](../guides/serve-object-ranges.md) |
| Key-value state | `kv_put(namespace, key, value)`, `kv_get(namespace, key)`, `kv_delete`, `kv_put_many`, `kv_get_many`, `kv_count` | [part 4](../tutorial/state.md) |
| Vectors | `create_vector_collection(name, VectorCollectionOptions { .. })`, `put_vectors(name, &[VectorInput { .. }])`, `search_vectors(name, VectorValues::F32(&query), limit)`, `search_vectors_by_id(name, id, limit)` | [part 2](../tutorial/search.md) |
| Graphs | `create_graph(name)`, `put_graph_node(GraphNodeInput { .. })`, `put_graph_edges(&[GraphEdgeInput { .. }])`, `graph_neighbors(GraphNeighborsOptions { .. })`, `graph_walk(GraphWalkOptions { .. })` | [part 3](../tutorial/relate.md) |
| App events | `listen(channel)` returns a `Subscription` with `try_receive()`; `notify(channel, payload)` | [part 4](../tutorial/state.md) |
| Copies and space | `backup_to`, `backup_to_with_progress`, `compact_to`, `compact_to_with_progress`, `reclaim_space(ReclaimOptions::default())`; free function `zova::restore_backup` | [part 5](../tutorial/maintain.md) |
| Formats | free functions `zova::probe_format(path)`, `migrate_database`, `migrate_database_with_progress`, `migrate_database_with_extensions`; `Database::convert_sqlite_to_zova` | [guide](../guides/migrate-format.md) |

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
assert_eq!(query.column_text(0)?.as_deref(), Some("sage"));
```

Dropping statements and result owners releases their native resources. Do not try to use a database mutably while a statement still holds the corresponding borrow; finish or drop the statement first.

## Transactions and scoped work

The crate exposes transactions, immediate transactions, named savepoints, and closure-based savepoint helpers. On a shared handle, scoped guards keep the mutex for the complete unit so another clone cannot interleave calls in the middle.

`transaction`, `transaction_immediate`, and `with_savepoint` roll their scope back when the closure returns an error and also when it panics. The rollback happens before the connection lock is released, then the panic propagates unchanged; use `std::panic::catch_unwind` to recover from it. This does not apply to `panic = "abort"` profiles or process termination. If a rollback fails, that `SharedDatabase` handle is retired and its later calls fail; open a new one.

Use the transaction APIs rather than issuing raw transaction SQL when app events or Zova's transaction-aware behavior must track the scope.

## Specialized storage

The safe crate covers:

- complete and streaming objects, range reads, chunks, and assembly;
- transactional binary KV and in-memory databases;
- typed vector collections, CRUD, batch writes, and exact search;
- graphs, nodes, edges, neighbors, and bounded walks;
- SQL-native vector and graph helpers through prepared statements;
- same-process app events; and
- backup, compact, restore, and bundled extension lifecycle.

It also provides:

- `reclaim_space(ReclaimOptions::default())`, returning one `ReclaimedMember` per member file with `pages_released` and `free_pages_left`;
- `object_seekable_reader(id)`, a `Read + Seek` reader for range serving, plus `object_seekable_reader_owned` and `SharedDatabase::object_seekable_reader`;
- `backup_to_with_progress`, `compact_to_with_progress`, and `migrate_database_with_progress`, whose callback returns `ControlFlow::Break(())` to cancel; and
- `migrate_database_with_extensions(source, destination, options, &extensions)` for databases with non-bundled extensions installed.

```rust
use zova::ReclaimOptions;

let members = db.reclaim_space(ReclaimOptions::default())?;
println!("{} pages released", members[0].pages_released);
```

After opening a main database with bound stores, the same object, vector, and graph methods route transparently. Creating, binding, splitting, and unbinding stores remains CLI/native Zig-only.

## Native packaging and extensions

The crate selects a target-specific generated-C companion crate, so supported consumers need Rust 1.79+ and a C compiler but not Zig or a build-time source download. Bundled extensions such as `trgm` are available through safe lifecycle methods.

The safe crate selects trusted `.zovaext` bundles at create/open:

```rust
let extensions = zova::ExtensionOptions {
    bundle_paths: vec!["./search.zovaext".into()],
    trust_store_path: None,
};
let mut db = zova::Database::create_with_extensions("app.zova", &extensions)?;
db.install_extension("search")?;
// Reopen with Database::open_with_extensions(path, OpenOptions, &extensions).
```

Trust the bundle first with `zova extension trust ./search.zovaext`; opening never grants trust or selects code from database metadata. `SharedDatabase` provides the same constructors. Child handles keep the connection and loaded libraries alive. Bundles and their runtime dependencies must match the host OS, CPU, and deployment target.

Scalar callback registration, explicit extension-data upgrades, linked plugin descriptors, and extension-aware migration are exposed only at the raw `zova-sys` boundary.

Raw `zova-sys` also declares the opaque graph key, edge payload, topology scan, prepared build, and fresh-build session APIs. The safe `zova` crate deliberately does not wrap those low-level publication surfaces.

The [tutorial](../get-started/first-database.md) builds a complete application in Rust and the other bindings, and the Concepts chapters explain storage semantics.
