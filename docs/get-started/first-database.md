# First database

This walkthrough creates a relational table, writes a row through a prepared statement, and stores an object. It demonstrates the intended split: searchable metadata in SQL and large immutable bytes in object storage.

## Create and write

```rust
use zova::{Database, Step};

fn main() -> Result<(), zova::Error> {
    let mut db = Database::create("app.zova")?;
    db.exec(
        "create table attachments(\
           id integer primary key,\
           filename text not null,\
           object_id blob not null\
         )",
    )?;

    let object_id = db.put_object(b"the file bytes")?;
    let mut insert = db.prepare(
        "insert into attachments(filename, object_id) values (?1, ?2)",
    )?;
    insert.bind_text(1, "notes.txt")?;
    insert.bind_blob(2, object_id.as_bytes())?;
    assert_eq!(insert.step()?, Step::Done);
    Ok(())
}
```

## Model deliberately

Store titles, timestamps, ownership, state, and constraints in SQL. Store immutable byte payloads as objects. Add vectors when you need similarity ranking and graph edges when explicit relationships are easier to traverse than repeated application joins.

:::tip[Start single-file]
A normal `.zova` file already supports all four storage shapes. Optional bound stores are an operational placement choice, not a prerequisite.
:::

## Next steps

- Learn how [objects](../core/objects.md) are identified and deduplicated.
- Add an exact-search [vector collection](../core/vectors.md).
- Model stable relationships with [graphs](../core/graphs.md).
- Wrap related SQL and specialized writes in a transaction before production use.
