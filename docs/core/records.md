# Records and relational data

Records are ordinary SQLite tables owned by your application. They are the right place for metadata, constraints, indexes, joins, views, triggers, and state that changes over time.

Objects, vectors, and graphs solve specialized storage problems, but records give those values application meaning. A vector can rank `chunk:42`; the SQL row explains which document that chunk belongs to, which user may see it, and whether it is still active.

## Start with the relational model

Consider a document search application:

```sql
create table documents(
  id integer primary key,
  title text not null,
  media_type text not null,
  object_id blob not null,
  created_at text not null default current_timestamp
);

create table chunks(
  id integer primary key,
  document_id integer not null references documents(id),
  body text not null,
  vector_id text not null unique
);

create index chunks_by_document on chunks(document_id);
```

The schema expresses application invariants. Zova does not move these columns into a document abstraction or hide them behind a generated model. You retain SQLite's query language and migration practices.

The `object_id` and `vector_id` columns are application-owned references. Zova does not install foreign keys from arbitrary user tables into private storage, because specialized values may be shared and applications need different retention policies.

## Execute SQL through Zova

Every supported binding exposes database creation and opening, direct SQL execution, prepared statements, typed binding, row stepping, typed column access, transactions, savepoints, change counts, and row IDs.

```rust
use zova::{Database, Step};

let mut db = Database::create("notes.zova")?;
db.exec(
    "create table notes(\
       id integer primary key,\
       body text not null,\
       pinned integer not null default 0\
     )",
)?;

let mut insert = db.prepare(
    "insert into notes(body, pinned) values (?1, ?2)",
)?;
insert.bind_text(1, "Explain the storage boundary")?;
insert.bind_i64(2, 1)?;
assert_eq!(insert.step()?, Step::Done);
drop(insert);

assert_eq!(db.changes()?, 1);
println!("new note: {}", db.last_insert_rowid()?);
```

Use prepared statements whenever values come from outside the program. Binding preserves type information and avoids constructing SQL from untrusted input.

## Read rows deliberately

A prepared query advances one result at a time:

```rust
let mut query = db.prepare(
    "select id, body from notes where pinned = ?1 order by id",
)?;
query.bind_i64(1, 1)?;

while query.step()? == Step::Row {
    let id = query.column_i64(0)?.unwrap();
    let body = query.column_text(1)?.unwrap();
    println!("{id}: {body}");
}
```

Column indexes follow the selected expression order. Nullable SQL values appear as optional values in high-level bindings. Treat column names and types as part of your application query contract, not as an interface to `_zova_*` tables.

## Transactions define logical work

Use a transaction when several mutations form one application operation:

```rust
db.begin_immediate()?;

let result = (|| -> Result<(), zova::Error> {
    db.exec("update notes set pinned = 0")?;
    db.exec("update notes set pinned = 1 where id = 7")?;
    db.notify("notes:pinned", "7")?;
    Ok(())
})();

match result {
    Ok(()) => db.commit()?,
    Err(error) => {
        db.rollback()?;
        return Err(error);
    }
}
```

`begin_immediate` acquires the SQLite write reservation at the start instead of waiting until the first write. That can make contention behavior easier to reason about for write workflows. Zova installs no nonzero busy timeout by default; configure one explicitly when another handle should be allowed time to finish.

Specialized mutations use the same database handle and follow Zova's documented transaction policy. When a bound store is attached, its supported mutations participate through SQLite `ATTACH`; the limitations of multi-file crash atomicity still apply.

## Savepoints provide partial rollback

Savepoints let a larger transaction discard one inner attempt without discarding earlier work:

```rust
db.begin_immediate()?;
db.savepoint("optional_import")?;

if let Err(error) = db.exec("insert into notes(body) values ('imported')") {
    db.rollback_to_savepoint("optional_import")?;
    eprintln!("skipped optional import: {error}");
}

db.release_savepoint("optional_import")?;
db.commit()?;
```

`ROLLBACK TO` keeps the named savepoint active; `RELEASE` removes it. Rolling back an outer transaction can still undo a savepoint that was previously released.

## SQLite policy remains visible

Format-8 handles start with SQLite foreign-key enforcement enabled so Zova can enforce private graph endpoint constraints and cascades. This also enforces foreign keys in application-owned tables on the same connection. Define valid constraints and treat violations as application errors.

Zova does not silently change journal or synchronous mode, enable auto-vacuum, or run `VACUUM`. Configure those decisions for your workload:

```sql
pragma journal_mode = wal;
```

Do not copy a PRAGMA recipe without understanding its durability and deployment effects. In particular, journal mode affects bound-store transaction guarantees and how database sidecar files must be handled.

## Ownership rules to keep

- Keep application metadata in your own tables.
- Treat `_zova_*` tables as private implementation details.
- Store object, vector, and graph identifiers as explicit references.
- Define deletion and retention behavior in application code or your own triggers.
- Open through Zova when a query uses Zova's SQL functions or virtual tables.

Next, read [Objects](./objects.md) to see how immutable bytes connect to records, or [SQL access](./sql.md) to combine relational filtering with vector and graph results.
