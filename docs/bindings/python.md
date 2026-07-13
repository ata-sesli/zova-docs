# Python

The Python package is a PyO3 extension backed by the safe Rust crate.

```python
import zova

with zova.Database.create("app.zova") as db:
    db.exec("create table notes(id integer primary key, body text not null)")
    with db.prepare("insert into notes(body) values (?1)") as stmt:
        stmt.bind_text(1, "hello")
        assert stmt.step() == zova.Step.DONE
```

## Coverage

Python exposes SQL and prepared statements, transactions, savepoints, app events, backup/compact/restore, objects and streaming writers, vectors, graphs, SQL-native search/traversal helpers, and bundled extension lifecycle APIs.

Use context managers for databases, statements, listeners, and writers so native resources close deterministically. Existing specialized APIs route through bound stores after open, but store management is CLI/native Zig-only in v0.23.

## Packaging

Published wheels for supported Linux/macOS and CPython targets need no local compiler. A source-distribution fallback uses Cargo and a C compiler. External dynamic extension loading is unavailable in generated-C package snapshots.

