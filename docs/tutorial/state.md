---
sidebar_label: 4. App state and change events
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Tutorial part 4: Keep app state and react to changes

A document library also has small pieces of state that do not need a table, such as where a reader stopped. And when one component adds a document, others, like a sidebar or a search index, need to know. This part covers both: key-value storage for the reading position, and app events that are delivered only when a transaction commits.

## What you will build in this part

- a reading position stored under namespace `reading-position`, key `document:1`;
- a listener on the `documents:changed` channel;
- a transaction that is rolled back, and whose event is never delivered; and
- a fourth document whose insert event is delivered after commit.

## Step 1: Store a reading position

<Tabs groupId="programming-languages" defaultValue="javascript">
  <TabItem value="javascript" label="JavaScript">

```js
const positions = encoder.encode("reading-position");
db.kvPut(positions, encoder.encode("document:1"), encoder.encode("128"));
const position = db.kvGet(positions, encoder.encode("document:1"));
console.log(`resume document:1 at byte ${decoder.decode(position)}`);
```

  </TabItem>
  <TabItem value="python" label="Python">

```python
db.kv_put(b"reading-position", b"document:1", b"128")
position = db.kv_get(b"reading-position", b"document:1")
print(f"resume document:1 at byte {position.decode()}")
```

  </TabItem>
  <TabItem value="rust" label="Rust">

```rust
db.kv_put(b"reading-position", b"document:1", b"128")?;
let position = db.kv_get(b"reading-position", b"document:1")?.unwrap();
println!("resume document:1 at byte {}", String::from_utf8_lossy(&position));
```

  </TabItem>
  <TabItem value="go" label="Go">

```go
must(db.KvPut([]byte("reading-position"), []byte("document:1"), []byte("128")))
position, err := db.KvGet([]byte("reading-position"), []byte("document:1"))
must(err)
fmt.Printf("resume document:1 at byte %s\n", position)
```

  </TabItem>
</Tabs>

Key-value storage holds byte-string values under a byte-string namespace and key. Use it when the application already knows the exact key and does not need joins, constraints, or ad hoc queries. KV writes take part in the current transaction like any SQL statement, so a reading position can be saved atomically with the rows it describes.

## Step 2: Listen for changes

<Tabs groupId="programming-languages" defaultValue="javascript">
  <TabItem value="javascript" label="JavaScript">

```js
const subscription = db.listen("documents:changed");
```

  </TabItem>
  <TabItem value="python" label="Python">

```python
with db.listen("documents:changed") as subscription:
    ...  # the rest of this part runs inside this block
```

  </TabItem>
  <TabItem value="rust" label="Rust">

```rust
let mut subscription = db.listen("documents:changed")?;
```

  </TabItem>
  <TabItem value="go" label="Go">

```go
subscription, err := db.Listen("documents:changed")
must(err)
defer subscription.Close()
```

  </TabItem>
</Tabs>

A listener subscribes to one channel on this database handle. App events are same-process notifications: they do not cross processes, and they are not stored in the file. Receiving is polling. `try_receive` returns the next pending event, or nothing when the queue is empty, and Zova never calls back into your code.

## Step 3: Roll back, and nothing is delivered

<Tabs groupId="programming-languages" defaultValue="javascript">
  <TabItem value="javascript" label="JavaScript">

```js
db.beginImmediate();
db.putObject(encoder.encode("Draft that will be discarded."));
db.notify("documents:changed", "draft");
db.rollback();
console.log("after rollback:", subscription.tryReceive());
```

  </TabItem>
  <TabItem value="python" label="Python">

```python
db.begin_immediate()
db.put_object(b"Draft that will be discarded.")
db.notify("documents:changed", "draft")
db.rollback()
print("after rollback:", subscription.try_receive())
```

  </TabItem>
  <TabItem value="rust" label="Rust">

```rust
db.begin_immediate()?;
db.put_object(b"Draft that will be discarded.")?;
db.notify("documents:changed", "draft")?;
db.rollback()?;
println!("after rollback: {:?}", subscription.try_receive()?);
```

  </TabItem>
  <TabItem value="go" label="Go">

```go
must(db.BeginImmediate())
_, err = db.PutObject([]byte("Draft that will be discarded."))
must(err)
must(db.Notify("documents:changed", "draft"))
must(db.Rollback())
note, err := subscription.TryReceive()
must(err)
fmt.Println("after rollback:", note)
```

  </TabItem>
</Tabs>

Calling `notify` inside a transaction queues the event with the transaction. Rollback discards the event together with the object written in the same scope, so the listener sees nothing. Without this rule, other components could reload data that never existed.

## Step 4: Commit, and the event arrives

<Tabs groupId="programming-languages" defaultValue="javascript">
  <TabItem value="javascript" label="JavaScript">

```js
db.transaction((tx) => {
  const objectId = tx.putObject(encoder.encode("Reading list for the next trip."));
  const insert = tx.prepare(
    "insert into documents(title, media_type, object_id) values (?1, ?2, ?3)",
  );
  insert.bindText(1, "reading-list.txt");
  insert.bindText(2, "text/plain");
  insert.bindBlob(3, objectId);
  insert.step();
  insert.close();
  tx.notify("documents:changed", `document:${tx.lastInsertRowid()}`);
});

const note = subscription.tryReceive();
console.log(`after commit: ${note.channel} ${note.payload}`);
```

  </TabItem>
  <TabItem value="python" label="Python">

```python
db.begin_immediate()
object_id = db.put_object(b"Reading list for the next trip.")
with db.prepare(
    "insert into documents(title, media_type, object_id) values (?1, ?2, ?3)"
) as insert:
    insert.bind_text(1, "reading-list.txt")
    insert.bind_text(2, "text/plain")
    insert.bind_blob(3, bytes(object_id))
    insert.step()
db.notify("documents:changed", f"document:{db.last_insert_rowid()}")
db.commit()

note = subscription.try_receive()
print(f"after commit: {note.channel} {note.payload}")
```

  </TabItem>
  <TabItem value="rust" label="Rust">

```rust
db.begin_immediate()?;
let object_id = db.put_object(b"Reading list for the next trip.")?;
let mut insert = db.prepare(
    "insert into documents(title, media_type, object_id) values (?1, ?2, ?3)",
)?;
insert.bind_text(1, "reading-list.txt")?;
insert.bind_text(2, "text/plain")?;
insert.bind_blob(3, object_id.as_ref())?;
assert_eq!(insert.step()?, Step::Done);
drop(insert);
let payload = format!("document:{}", db.last_insert_rowid()?);
db.notify("documents:changed", &payload)?;
db.commit()?;

let note = subscription.try_receive()?.unwrap();
println!("after commit: {} {}", note.channel, note.payload);
```

  </TabItem>
  <TabItem value="go" label="Go">

```go
must(db.BeginImmediate())
objectID, err := db.PutObject([]byte("Reading list for the next trip."))
must(err)
insert, err := db.Prepare("insert into documents(title, media_type, object_id) values (?1, ?2, ?3)")
must(err)
must(insert.BindText(1, "reading-list.txt"))
must(insert.BindText(2, "text/plain"))
must(insert.BindBlob(3, objectID[:]))
_, err = insert.Step()
must(err)
must(insert.Close())
rowID, err := db.LastInsertRowID()
must(err)
must(db.Notify("documents:changed", fmt.Sprintf("document:%d", rowID)))
must(db.Commit())

note, err = subscription.TryReceive()
must(err)
fmt.Printf("after commit: %s %s\n", note.Channel, note.Payload)
```

  </TabItem>
</Tabs>

After commit, the event is delivered with the payload you chose. Here the payload carries the new row ID, so the receiving component knows which document to load. Keep payloads small and use them to say *what* changed; the database remains the source of the data itself.

Use the binding's transaction calls rather than raw `BEGIN` and `COMMIT` SQL. Zova tracks those scopes to decide when events are delivered or discarded. [App events](../guides/app-events.md) covers savepoints, channel design, and delivery limits.

## Run it

<Tabs groupId="programming-languages" defaultValue="javascript">
  <TabItem value="javascript" label="JavaScript">

```sh
node state.mjs
```

  </TabItem>
  <TabItem value="python" label="Python">

```sh
uv run state.py
```

  </TabItem>
  <TabItem value="rust" label="Rust">

```sh
cargo run --bin state
```

  </TabItem>
  <TabItem value="go" label="Go">

```sh
go run ./state
```

  </TabItem>
</Tabs>

Expected output:

<Tabs groupId="programming-languages" defaultValue="javascript">
  <TabItem value="javascript" label="JavaScript">

```text
resume document:1 at byte 128
after rollback: null
after commit: documents:changed document:4
```

  </TabItem>
  <TabItem value="python" label="Python">

```text
resume document:1 at byte 128
after rollback: None
after commit: documents:changed document:4
```

  </TabItem>
  <TabItem value="rust" label="Rust">

```text
resume document:1 at byte 128
after rollback: None
after commit: documents:changed document:4
```

  </TabItem>
  <TabItem value="go" label="Go">

```text
resume document:1 at byte 128
after rollback: <nil>
after commit: documents:changed document:4
```

  </TabItem>
</Tabs>

## The complete program

<Tabs groupId="programming-languages" defaultValue="javascript">
  <TabItem value="javascript" label="JavaScript">

```js title="state.mjs"
import { Database } from "zova-js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const db = Database.open("library.zova");
try {
  const positions = encoder.encode("reading-position");
  db.kvPut(positions, encoder.encode("document:1"), encoder.encode("128"));
  const position = db.kvGet(positions, encoder.encode("document:1"));
  console.log(`resume document:1 at byte ${decoder.decode(position)}`);

  const subscription = db.listen("documents:changed");

  db.beginImmediate();
  db.putObject(encoder.encode("Draft that will be discarded."));
  db.notify("documents:changed", "draft");
  db.rollback();
  console.log("after rollback:", subscription.tryReceive());

  db.transaction((tx) => {
    const objectId = tx.putObject(encoder.encode("Reading list for the next trip."));
    const insert = tx.prepare(
      "insert into documents(title, media_type, object_id) values (?1, ?2, ?3)",
    );
    insert.bindText(1, "reading-list.txt");
    insert.bindText(2, "text/plain");
    insert.bindBlob(3, objectId);
    insert.step();
    insert.close();
    tx.notify("documents:changed", `document:${tx.lastInsertRowid()}`);
  });

  const note = subscription.tryReceive();
  console.log(`after commit: ${note.channel} ${note.payload}`);
  subscription.close();
} finally {
  db.close();
}
```

  </TabItem>
  <TabItem value="python" label="Python">

```python title="state.py"
import zova

with zova.Database.open("library.zova") as db:
    db.kv_put(b"reading-position", b"document:1", b"128")
    position = db.kv_get(b"reading-position", b"document:1")
    print(f"resume document:1 at byte {position.decode()}")

    with db.listen("documents:changed") as subscription:
        db.begin_immediate()
        db.put_object(b"Draft that will be discarded.")
        db.notify("documents:changed", "draft")
        db.rollback()
        print("after rollback:", subscription.try_receive())

        db.begin_immediate()
        object_id = db.put_object(b"Reading list for the next trip.")
        with db.prepare(
            "insert into documents(title, media_type, object_id) values (?1, ?2, ?3)"
        ) as insert:
            insert.bind_text(1, "reading-list.txt")
            insert.bind_text(2, "text/plain")
            insert.bind_blob(3, bytes(object_id))
            insert.step()
        db.notify("documents:changed", f"document:{db.last_insert_rowid()}")
        db.commit()

        note = subscription.try_receive()
        print(f"after commit: {note.channel} {note.payload}")
```

  </TabItem>
  <TabItem value="rust" label="Rust">

```rust title="src/bin/state.rs"
use zova::{Database, Step};

fn main() -> Result<(), zova::Error> {
    let mut db = Database::open("library.zova")?;
    db.kv_put(b"reading-position", b"document:1", b"128")?;
    let position = db.kv_get(b"reading-position", b"document:1")?.unwrap();
    println!("resume document:1 at byte {}", String::from_utf8_lossy(&position));

    let mut subscription = db.listen("documents:changed")?;

    db.begin_immediate()?;
    db.put_object(b"Draft that will be discarded.")?;
    db.notify("documents:changed", "draft")?;
    db.rollback()?;
    println!("after rollback: {:?}", subscription.try_receive()?);

    db.begin_immediate()?;
    let object_id = db.put_object(b"Reading list for the next trip.")?;
    let mut insert = db.prepare(
        "insert into documents(title, media_type, object_id) values (?1, ?2, ?3)",
    )?;
    insert.bind_text(1, "reading-list.txt")?;
    insert.bind_text(2, "text/plain")?;
    insert.bind_blob(3, object_id.as_ref())?;
    assert_eq!(insert.step()?, Step::Done);
    drop(insert);
    let payload = format!("document:{}", db.last_insert_rowid()?);
    db.notify("documents:changed", &payload)?;
    db.commit()?;

    let note = subscription.try_receive()?.unwrap();
    println!("after commit: {} {}", note.channel, note.payload);
    Ok(())
}
```

  </TabItem>
  <TabItem value="go" label="Go">

```go title="state/main.go"
package main

import (
	"fmt"
	"log"

	zova "github.com/ata-sesli/zova/bindings/go"
)

func main() {
	db, err := zova.Open("library.zova")
	must(err)
	defer db.Close()

	must(db.KvPut([]byte("reading-position"), []byte("document:1"), []byte("128")))
	position, err := db.KvGet([]byte("reading-position"), []byte("document:1"))
	must(err)
	fmt.Printf("resume document:1 at byte %s\n", position)

	subscription, err := db.Listen("documents:changed")
	must(err)
	defer subscription.Close()

	must(db.BeginImmediate())
	_, err = db.PutObject([]byte("Draft that will be discarded."))
	must(err)
	must(db.Notify("documents:changed", "draft"))
	must(db.Rollback())
	note, err := subscription.TryReceive()
	must(err)
	fmt.Println("after rollback:", note)

	must(db.BeginImmediate())
	objectID, err := db.PutObject([]byte("Reading list for the next trip."))
	must(err)
	insert, err := db.Prepare("insert into documents(title, media_type, object_id) values (?1, ?2, ?3)")
	must(err)
	must(insert.BindText(1, "reading-list.txt"))
	must(insert.BindText(2, "text/plain"))
	must(insert.BindBlob(3, objectID[:]))
	_, err = insert.Step()
	must(err)
	must(insert.Close())
	rowID, err := db.LastInsertRowID()
	must(err)
	must(db.Notify("documents:changed", fmt.Sprintf("document:%d", rowID)))
	must(db.Commit())

	note, err = subscription.TryReceive()
	must(err)
	fmt.Printf("after commit: %s %s\n", note.Channel, note.Payload)
}

func must(err error) {
	if err != nil {
		log.Fatal(err)
	}
}
```

  </TabItem>
</Tabs>

## What you learned

- KV storage holds byte values by namespace and key, inside the same transactions as SQL.
- App events are same-process and polled. Nothing calls back into your code.
- Events are delivered only after commit. Rollback discards them along with the data.

**Next:** [Part 5: Back up and reclaim space](./maintain.md) imports a large file, backs up the library, and returns the space after deleting it.
