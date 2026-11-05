# Python

The Python package is a PyO3 extension backed by the safe Rust crate. It exposes Python-owned wrappers around Zova database handles and results while preserving the same file format and storage behavior as other bindings.

## Install and create a database

```sh
uv add zova==1.4.0
# or
python -m pip install zova==1.4.0
```

```python
import zova

with zova.Database.create("app.zova") as db:
    db.exec(
        "create table notes("
        "id integer primary key, "
        "body text not null)"
    )

    with db.prepare("insert into notes(body) values (?1)") as stmt:
        stmt.bind_text(1, "hello from Python")
        assert stmt.step() == zova.Step.DONE
```

Use context managers for databases, statements, writers, listeners, and other closeable native resources. Deterministic closure reports cleanup errors at the point where the resource is still in scope.

## API at a glance

The [tutorial](../get-started/first-database.md) uses most of these calls in complete programs. Methods are on `zova.Database` unless a module function or type is named.

| Task | Calls | Tutorial |
|---|---|---|
| Create or open a database | `Database.create(path)`, `Database.open(path, read_only=False)`, `Database.create_memory()`; all are context managers | [part 1](../get-started/first-database.md) |
| Run SQL | `exec(sql)`; `prepare(sql)` returns a statement context manager | [part 1](../get-started/first-database.md) |
| Bind and read values | `bind_text`, `bind_int`, `bind_float`, `bind_blob`, `bind_null`; `step()` returns `Step.ROW` or `Step.DONE`; `column_text`, `column_int`, `column_float`, `column_blob` | [part 1](../get-started/first-database.md) |
| Group writes | `begin_immediate`, `commit`, `rollback`; `savepoint`, `rollback_to_savepoint`, `release_savepoint`; `savepoint_context(name)` | [part 2](../tutorial/search.md) |
| Store and read bytes | `put_object(data)`, `get_object(id)`, `read_object_range(id, offset, length)`, `object_size(id)`, `delete_object(id)`; `ObjectId(blob)` and `.hex()` | [part 1](../get-started/first-database.md) |
| Stream large objects | `object_writer()` with `write`, `finish`, `cancel`; `object_seekable_reader(id)`, a file-like reader | [guide](../guides/serve-object-ranges.md) |
| Key-value state | `kv_put(namespace, key, value)`, `kv_get(namespace, key)`, `kv_delete`, `kv_put_many`, `kv_get_many`, `kv_count` | [part 4](../tutorial/state.md) |
| Vectors | `create_vector_collection(name, VectorCollectionOptions(...))`, `put_vectors(name, [VectorInput(...)])`, `search_vectors(name, element_type, query, limit)`, `search_vectors_by_id(name, id, limit)`; `encode_f32_le(values)` for SQL | [part 2](../tutorial/search.md) |
| Graphs | `create_graph(name)`, `put_graph_node(GraphNodeInput(...))`, `put_graph_edge(GraphEdgeInput(...))`, `graph_neighbors(GraphNeighborsOptions(...))`, `graph_walk(GraphWalkOptions(...))` | [part 3](../tutorial/relate.md) |
| App events | `listen(channel)`, a context manager with `try_receive()`; `notify(channel, payload)` | [part 4](../tutorial/state.md) |
| Copies and space | `backup_to(destination, verify=True, progress=None)`, `compact_to`, `reclaim_space()`; module `restore_backup` | [part 5](../tutorial/maintain.md) |
| Formats | module `probe_format(path)`, `migrate_database(source, destination, ...)`, `convert_sqlite_to_zova` | [guide](../guides/migrate-format.md) |

## Read rows

```python
with zova.Database.open("app.zova") as db:
    with db.prepare("select id, body from notes order by id") as stmt:
        while stmt.step() == zova.Step.ROW:
            print(stmt.column_int(0), stmt.column_text(1))
```

Prepared bindings keep values separate from SQL. Nullable columns are represented through the binding's optional return behavior.

## Transactions and savepoints

Python exposes explicit begin, commit, rollback, and savepoint operations plus context-managed helpers. A savepoint context rolls back and releases on an exception, then re-raises the original exception when cleanup succeeds.

Use Zova's transaction helpers when app-event delivery must follow commit and rollback. Raw SQL transaction scopes cannot provide Zova with the same notification lifetime information.

## Specialized storage coverage

The package includes:

- objects, range reads, streaming `ObjectWriter`, chunks, and assembly;
- transactional binary KV and in-memory databases;
- typed vectors and exact search;
- graphs and bounded traversal;
- SQL-native vector and graph helpers;
- same-process app events;
- backup, compact, and restore; and
- bundled extension lifecycle operations.

```python
with zova.Database.open("app.zova") as db:
    object_id = db.put_object(b"hello from Zova")
    assert db.read_object_range(object_id, 0, 5) == b"hello"
```

The package also provides `reclaim_space()`, `object_seekable_reader()`, a `progress=` callback on `backup_to`, `compact_to`, and `migrate_database`, and `extension_bundles` and `trust_store_path` on `migrate_database`. Raising from a progress callback cancels the operation and re-raises the exception.

```python
with zova.Database.open("app.zova") as db:
    with db.object_seekable_reader(object_id) as reader:
        reader.seek(1024 * 1024)
        part = reader.read(64 * 1024)

    for member in db.reclaim_space():
        print(member.member, member.pages_released, member.free_pages_left)
```

Existing specialized APIs route through optional bound stores after open. Store creation, binding, splitting, and unbinding remains CLI/native Zig-only.

## Packaging boundary

Published stable-ABI wheels cover Linux and macOS x86_64/arm64 and Windows x86_64. Python 3.13 or newer is required; CPython 3.13 and 3.14 are tested. Matching wheels need no compiler, and no Python source distribution is published.

The package build uses generated native sources. Bundled extensions such as `trgm` are available. Wheels also accept explicitly trusted `.zovaext` bundles:

```python
db = zova.Database.create("app.zova", extension_bundles=["./search.zovaext"])
db.install_extension("search")
db.close()
db = zova.Database.open("app.zova", read_only=True,
                        extension_bundles=["./search.zovaext"])
```

Both constructors accept `trust_store_path`; omit it for Zova's default store. Trust the bundle first with `zova extension trust ./search.zovaext`. Opening never grants trust or loads paths from the database. Native code and its dependencies must match the host. Owned statements keep their connection and libraries alive after `db.close()`.

Extension authoring, scalar callbacks, and explicit extension-data upgrades are not Python APIs. Use the CLI, C ABI, or a native host when those capabilities are required.

Read [Objects](../core/objects.md), [Vectors](../core/vectors.md), and [Graphs](../core/graphs.md) for behavior shared across bindings.
