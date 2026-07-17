# Python

The Python package is a PyO3 extension backed by the safe Rust crate. It exposes Python-owned wrappers around Zova database handles and results while preserving the same file format and storage behavior as other bindings.

## Install and create a database

```sh
uv add zova==0.23.0
# or
python -m pip install zova==0.23.0
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

## Read rows

```python
with zova.Database.open("app.zova") as db:
    with db.prepare("select id, body from notes order by id") as stmt:
        while stmt.step() == zova.Step.ROW:
            print(stmt.column_i64(0), stmt.column_text(1))
```

Prepared bindings keep values separate from SQL. Nullable columns are represented through the binding's optional return behavior.

## Transactions and savepoints

Python exposes explicit begin, commit, rollback, and savepoint operations plus context-managed helpers. A savepoint context rolls back and releases on an exception, then re-raises the original exception when cleanup succeeds.

Use Zova's transaction helpers when app-event delivery must follow commit and rollback. Raw SQL transaction scopes cannot provide Zova with the same notification lifetime information.

## Specialized storage coverage

The package includes:

- objects, range reads, streaming `ObjectWriter`, chunks, and assembly;
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

Existing specialized APIs route through optional bound stores after open. Store creation, binding, splitting, and unbinding remains CLI/native Zig-only in v0.23.0.

## Packaging boundary

Published wheels for supported Linux/macOS and CPython targets include the native extension and need no compiler. A source-distribution install needs Rust and a C compiler.

The package build uses generated native sources. Bundled extensions such as `trgm` are available, but app-registered extension authoring, safe scalar callbacks, and dynamic `.zovaext` loading are not exposed as Python APIs. Use the CLI, C ABI, or a native host when those capabilities are required.

Read [Objects](../core/objects.md), [Vectors](../core/vectors.md), and [Graphs](../core/graphs.md) for behavior shared across bindings.
