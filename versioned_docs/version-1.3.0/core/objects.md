# Objects

Objects store immutable byte sequences by content identity. They are designed for files, payloads, serialized artifacts, and other bytes that should be verified and addressed independently of a filename or database row.

```text
ObjectId = SHA-256(complete object bytes)
```

Putting the same bytes produces the same object ID. The identifier describes the content itself, so renaming a file or attaching it to another record does not change its identity.

## Keep meaning in SQL

An object deliberately has no application filename, owner, MIME type, or permission model. Store those fields in a relational table and retain the object ID as a reference:

```sql
create table attachments(
  id integer primary key,
  message_id integer not null,
  filename text not null,
  media_type text,
  object_id blob not null,
  created_at text not null default current_timestamp
);
```

This separation allows multiple rows to reference identical content without copying the bytes, while each row keeps its own application context.

## Put and get complete objects

For values already in memory, use the complete-object API:

```rust
use std::convert::TryFrom;
use zova::{Database, ObjectId, Step};

let mut db = Database::create("files.zova")?;
db.exec(
    "create table attachments(\
       id integer primary key,\
       filename text not null,\
       object_id blob not null\
     )",
)?;

let id = db.put_object(b"file bytes")?;

let mut insert = db.prepare(
    "insert into attachments(filename, object_id) values (?1, ?2)",
)?;
insert.bind_text(1, "report.txt")?;
insert.bind_blob(2, id.as_ref())?;
assert_eq!(insert.step()?, Step::Done);
drop(insert);

let mut query = db.prepare(
    "select object_id from attachments where id = 1",
)?;
assert_eq!(query.step()?, Step::Row);
let stored_id = ObjectId::try_from(
    query.column_blob(0)?.unwrap().as_slice(),
)?;
drop(query);

assert_eq!(db.get_object(stored_id)?, b"file bytes");
```

The object lookup verifies that the stored content matches its identity before returning it.

## Stream large inputs

Use `ObjectWriter` when input arrives over time or should not be buffered as one allocation:

```rust
let mut writer = db.object_writer()?;
writer.write(b"first part\n")?;
writer.write(b"second part\n")?;
let object_id = writer.finish()?;
```

`finish` completes the manifest and returns the identity of the full byte sequence. In bindings with scoped writers, leaving without finishing cancels the writer and cleans up chunks that are not referenced elsewhere.

Transfer progress, expected filenames, retry state, and ownership still belong in your SQL tables. The object writer is a storage primitive, not an upload protocol.

## Objects and transactions

Since 1.2.0, synchronous object writes, deletes, chunk writes, and assembly are operation-atomic and join a caller-owned transaction. With no active transaction, each operation runs in its own immediate transaction; inside one, it takes an internal savepoint. A failed operation undoes only its own chunks, manifests, and metadata. Earlier work in the caller's transaction survives, and Zova never commits or rolls back that transaction on the caller's behalf.

This lets an object and the SQL row that references it commit together. Open a transaction with your binding's transaction helper, put the object, insert the row that stores its identity, and commit. A rollback of that transaction removes both the row and the object.

The streaming `ObjectWriter` is the exception. It holds no transaction across `write` calls, so a writer on the main database still fails inside an active caller transaction. Stream the object first, then reference the resulting identity from SQL. A bound object store still allows the writer inside caller transactions.

## Read only the bytes you need

Range reads avoid loading a complete object when an application needs a header, media segment, or page-aligned region. The request is expressed as an offset and length through the binding's range API.

Zova also exposes lower-level manifest and chunk workflows for transfer systems:

- inspect an object's ordered chunk manifest;
- fetch a chunk and verify its content identity;
- store loose verified chunks; and
- assemble a complete object once the expected manifest is available.

These operations make resumable transfer possible without turning Zova into a network service. The application still owns transport, authorization, retry policy, and peer discovery.

## Choose a chunking profile

The default `deduplication` profile uses FastCDC-v1 chunks. The additive `streaming` profile uses exact 1 MiB chunks except for the final remainder, reducing manifest rows for large payloads where cross-object deduplication matters less.

Both profiles produce the same full-object SHA-256 identity and verified chunk model. Replaying an existing object through another profile keeps its first valid physical representation.

## How deduplication works

Zova splits data using FastCDC-v1 and stores verified chunks. Two complete objects can share chunks even when their object IDs differ. Repeating the same complete content reuses the same object identity.

Deduplication is local to the active object store. Zova does not compare chunks across unrelated `.zova` files, bound stores, machines, or cloud locations.

:::note[Identity is immutable]
There is no in-place update of an object. Changing one byte creates a different object ID. Update the application row to reference the new ID, then apply your retention policy to the old object.
:::

## Deletion and space reclamation

Deleting an object removes its manifest and removes chunks no longer referenced by another object. It does **not** scan application tables for `object_id` columns or remove those rows.

Deleting SQLite rows frees pages for reuse but usually does not shrink the file immediately. Use a compact copy when physical size matters:

```sh
zova compact files.zova files.compact.zova
```

The destination must be a new path. Verify it, then replace the original through your own deployment process if desired.

## When to use an object

Use objects when content identity, verification, streaming, range reads, or deduplication matters. Keep a normal SQL `BLOB` when the bytes are small, mutable with the row, and do not benefit from independent identity.

Start with objects in the main `.zova` file. If object bytes later need a separate local placement lifecycle, read [Optional bound stores](../guides/bound-stores.md) before splitting them out.
