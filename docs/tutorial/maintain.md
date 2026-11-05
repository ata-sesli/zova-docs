---
sidebar_label: 5. Back up and reclaim space
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Tutorial part 5: Back up and reclaim space

The library now holds rows, objects, vectors, a graph, KV state, and four documents. In this last part you look after the file: import a large scan, take a verified backup with progress reporting, then delete the scan and return its pages to the filesystem.

## What you will build in this part

- a 4 MiB object standing in for an imported scan;
- `library.backup.zova`, a verified backup with progress events; and
- a smaller `library.zova` after the scan is deleted and its free pages are released.

## Step 1: Import a large object

<Tabs groupId="programming-languages" defaultValue="javascript">
  <TabItem value="javascript" label="JavaScript">

```js
const scanId = db.putObject(randomBytes(4 * 1024 * 1024));
console.log("imported a 4 MiB scan");
```

  </TabItem>
  <TabItem value="python" label="Python">

```python
scan_id = db.put_object(os.urandom(4 * 1024 * 1024))
print("imported a 4 MiB scan")
```

  </TabItem>
  <TabItem value="rust" label="Rust">

```rust
// Pseudo-random bytes stand in for an imported scan.
let mut state = 0x2545_f491_4f6c_dd1d_u64;
let scan: Vec<u8> = (0..4 * 1024 * 1024)
    .map(|_| {
        state ^= state << 13;
        state ^= state >> 7;
        state ^= state << 17;
        state as u8
    })
    .collect();
let scan_id = db.put_object(&scan)?;
println!("imported a 4 MiB scan");
```

  </TabItem>
  <TabItem value="go" label="Go">

```go
scan := make([]byte, 4*1024*1024)
rand.Read(scan)
scanID, err := db.PutObject(scan)
must(err)
fmt.Println("imported a 4 MiB scan")
```

  </TabItem>
</Tabs>

The scan uses random bytes so that it cannot be deduplicated or compressed away, and the space it occupies is real. Objects of any size use the same call; Zova splits them into content-defined chunks.

## Step 2: Back up with progress

<Tabs groupId="programming-languages" defaultValue="javascript">
  <TabItem value="javascript" label="JavaScript">

```js
console.log("Backing up:");
const worker = AsyncDatabase.open("library.zova");
try {
  await worker.backupTo("library.backup.zova", true, {
    progress: (event) => {
      if (event.done === event.total) {
        console.log(`  ${event.phase} ${event.member ?? "all"}: ${event.total} done`);
      }
    },
  });
} finally {
  await worker.close();
}
```

  </TabItem>
  <TabItem value="python" label="Python">

```python
def show(progress):
    if progress.done == progress.total:
        print(f"  {progress.phase} {progress.member or 'all'}: {progress.total} done")

print("Backing up:")
db.backup_to("library.backup.zova", progress=show)
```

  </TabItem>
  <TabItem value="rust" label="Rust">

```rust
println!("Backing up:");
db.backup_to_with_progress("library.backup.zova", BackupOptions::default(), |event| {
    if event.done == event.total {
        let member = event.member.map_or("all".to_owned(), |m| format!("{m:?}").to_lowercase());
        let phase = format!("{:?}", event.phase).to_lowercase();
        println!("  {phase} {member}: {} done", event.total);
    }
    ControlFlow::Continue(())
})?;
```

  </TabItem>
  <TabItem value="go" label="Go">

```go
fmt.Println("Backing up:")
must(db.BackupToWithProgress("library.backup.zova", zova.BackupOptions{},
	func(event zova.Progress) error {
		if event.Done == event.Total {
			fmt.Printf("  %s %s: %d done\n", phases[event.Phase], members[event.Member], event.Total)
		}
		return nil
	}))
```

  </TabItem>
</Tabs>

A backup is a consistent snapshot written to a new file. It never overwrites an existing destination, so delete `library.backup.zova` before running this program again. The backup is verified by default: Zova checks the copy before reporting success. The progress callback receives the current **phase** (copy, then verify), the **member** file it applies to, and `done` and `total` counts. Printing only when `done == total` keeps the output to one line per phase.

Returning a stop signal from the callback cancels the operation, and nothing is published: return `ControlFlow::Break(())` in Rust, return an error in Go, raise in Python, or abort the `signal` in JavaScript. JavaScript reports backup progress through `AsyncDatabase`, so the program opens a second handle for the backup.

## Step 3: Delete the scan and reclaim space

<Tabs groupId="programming-languages" defaultValue="javascript">
  <TabItem value="javascript" label="JavaScript">

```js
db.deleteObject(scanId);
for (const member of db.reclaimSpace()) {
  console.log(
    `reclaimed ${member.pagesReleased} pages from ${member.member}, ` +
      `${member.freePagesLeft} free pages left`,
  );
}
```

  </TabItem>
  <TabItem value="python" label="Python">

```python
db.delete_object(scan_id)
for member in db.reclaim_space():
    print(f"reclaimed {member.pages_released} pages from {member.member}, "
          f"{member.free_pages_left} free pages left")
```

  </TabItem>
  <TabItem value="rust" label="Rust">

```rust
db.delete_object(scan_id)?;
for member in db.reclaim_space(ReclaimOptions::default())? {
    println!(
        "reclaimed {} pages from {}, {} free pages left",
        member.pages_released,
        format!("{:?}", member.member).to_lowercase(),
        member.free_pages_left
    );
}
```

  </TabItem>
  <TabItem value="go" label="Go">

```go
must(db.DeleteObject(scanID))
reclaimed, err := db.ReclaimSpace()
must(err)
for _, member := range reclaimed {
	fmt.Printf("reclaimed %d pages from %s, %d free pages left\n",
		member.PagesReleased, members[member.Member], member.FreePagesLeft)
}
```

  </TabItem>
</Tabs>

Deleting an object frees its pages inside the file, but SQLite keeps them on a freelist instead of shrinking the file. `reclaim_space` releases those free pages to the filesystem in place, in short steps of at most 1024 pages, and returns one entry per member file. It changes no logical data.

Reclaim works on files in SQLite incremental auto-vacuum mode, which every file Zova 1.4 creates uses. Databases migrated from an earlier format keep their old mode and release nothing until you compact them once; [Reclaim disk space](../guides/reclaim-space.md) covers that case.

## Run it

<Tabs groupId="programming-languages" defaultValue="javascript">
  <TabItem value="javascript" label="JavaScript">

```sh
node maintain.mjs
```

  </TabItem>
  <TabItem value="python" label="Python">

```sh
uv run maintain.py
```

  </TabItem>
  <TabItem value="rust" label="Rust">

```sh
cargo run --bin maintain
```

  </TabItem>
  <TabItem value="go" label="Go">

```sh
go run ./maintain
```

  </TabItem>
</Tabs>

Expected output, with page counts that vary slightly between runs:

```text
imported a 4 MiB scan
Backing up:
  copy main: 1159 done
  verify all: 459 done
reclaimed 1116 pages from main, 0 free pages left
```

About 1,100 pages of 4 KiB each is the 4 MiB scan returning to the filesystem.

## The complete program

<Tabs groupId="programming-languages" defaultValue="javascript">
  <TabItem value="javascript" label="JavaScript">

```js title="maintain.mjs"
import { randomBytes } from "node:crypto";
import { AsyncDatabase, Database } from "zova-js";

const db = Database.open("library.zova");
try {
  const scanId = db.putObject(randomBytes(4 * 1024 * 1024));
  console.log("imported a 4 MiB scan");

  console.log("Backing up:");
  const worker = AsyncDatabase.open("library.zova");
  try {
    await worker.backupTo("library.backup.zova", true, {
      progress: (event) => {
        if (event.done === event.total) {
          console.log(`  ${event.phase} ${event.member ?? "all"}: ${event.total} done`);
        }
      },
    });
  } finally {
    await worker.close();
  }

  db.deleteObject(scanId);
  for (const member of db.reclaimSpace()) {
    console.log(
      `reclaimed ${member.pagesReleased} pages from ${member.member}, ` +
        `${member.freePagesLeft} free pages left`,
    );
  }
} finally {
  db.close();
}
```

  </TabItem>
  <TabItem value="python" label="Python">

```python title="maintain.py"
import os
import zova

with zova.Database.open("library.zova") as db:
    scan_id = db.put_object(os.urandom(4 * 1024 * 1024))
    print("imported a 4 MiB scan")

    def show(progress):
        if progress.done == progress.total:
            print(f"  {progress.phase} {progress.member or 'all'}: {progress.total} done")

    print("Backing up:")
    db.backup_to("library.backup.zova", progress=show)

    db.delete_object(scan_id)
    for member in db.reclaim_space():
        print(f"reclaimed {member.pages_released} pages from {member.member}, "
              f"{member.free_pages_left} free pages left")
```

  </TabItem>
  <TabItem value="rust" label="Rust">

```rust title="src/bin/maintain.rs"
use std::ops::ControlFlow;
use zova::{BackupOptions, Database, ReclaimOptions};

fn main() -> Result<(), zova::Error> {
    let mut db = Database::open("library.zova")?;
    // Pseudo-random bytes stand in for an imported scan.
    let mut state = 0x2545_f491_4f6c_dd1d_u64;
    let scan: Vec<u8> = (0..4 * 1024 * 1024)
        .map(|_| {
            state ^= state << 13;
            state ^= state >> 7;
            state ^= state << 17;
            state as u8
        })
        .collect();
    let scan_id = db.put_object(&scan)?;
    println!("imported a 4 MiB scan");

    println!("Backing up:");
    db.backup_to_with_progress("library.backup.zova", BackupOptions::default(), |event| {
        if event.done == event.total {
            let member = event.member.map_or("all".to_owned(), |m| format!("{m:?}").to_lowercase());
            let phase = format!("{:?}", event.phase).to_lowercase();
            println!("  {phase} {member}: {} done", event.total);
        }
        ControlFlow::Continue(())
    })?;

    db.delete_object(scan_id)?;
    for member in db.reclaim_space(ReclaimOptions::default())? {
        println!(
            "reclaimed {} pages from {}, {} free pages left",
            member.pages_released,
            format!("{:?}", member.member).to_lowercase(),
            member.free_pages_left
        );
    }
    Ok(())
}
```

  </TabItem>
  <TabItem value="go" label="Go">

```go title="maintain/main.go"
package main

import (
	"crypto/rand"
	"fmt"
	"log"

	zova "github.com/ata-sesli/zova/bindings/go"
)

var phases = map[zova.ProgressPhase]string{
	zova.ProgressCopy: "copy", zova.ProgressMigrate: "migrate",
	zova.ProgressVerify: "verify", zova.ProgressPublish: "publish",
}
var members = map[zova.ProgressMember]string{
	zova.ProgressMemberNone: "all", zova.ProgressMemberMain: "main",
	zova.ProgressMemberObjectStore: "object_store", zova.ProgressMemberVectorStore: "vector_store",
	zova.ProgressMemberGraphStore: "graph_store",
}

func main() {
	db, err := zova.Open("library.zova")
	must(err)
	defer db.Close()

	scan := make([]byte, 4*1024*1024)
	rand.Read(scan)
	scanID, err := db.PutObject(scan)
	must(err)
	fmt.Println("imported a 4 MiB scan")

	fmt.Println("Backing up:")
	must(db.BackupToWithProgress("library.backup.zova", zova.BackupOptions{},
		func(event zova.Progress) error {
			if event.Done == event.Total {
				fmt.Printf("  %s %s: %d done\n", phases[event.Phase], members[event.Member], event.Total)
			}
			return nil
		}))

	must(db.DeleteObject(scanID))
	reclaimed, err := db.ReclaimSpace()
	must(err)
	for _, member := range reclaimed {
		fmt.Printf("reclaimed %d pages from %s, %d free pages left\n",
			member.PagesReleased, members[member.Member], member.FreePagesLeft)
	}
}

func must(err error) {
	if err != nil {
		log.Fatal(err)
	}
}
```

  </TabItem>
</Tabs>

## Check, restore, and reclaim from the CLI

The same operations are available without writing code:

```sh
zova check --deep library.zova
zova restore library.backup.zova library.restored.zova
zova reclaim library.zova
```

`check --deep` ends with `status: ok`. `restore` writes a new file and verifies it, leaving both the backup and the original untouched. `reclaim` reports `pages_released: 0` now, because your program already released the free pages.

## What you learned

- Backups are consistent, verified, and written to a new file. Progress callbacks can cancel them.
- Deleting data leaves free pages in the file. Reclaim returns them in place, in short steps.
- `check --deep` validates every store, and `restore` produces a separate candidate you can check before switching to it.

## Where to go next

You have used every storage shape in one file. From here:

- Read the **Concepts** chapters, starting with [Records](../core/records.md), for the rules behind each shape.
- Use the **How-to guides** for focused tasks, such as [migrating from SQLite](../guides/sqlite-migration.md), [upgrading an older Zova file](../guides/migrate-format.md), or [serving objects with range requests](../guides/serve-object-ranges.md).
- Review [Operational safety](../operations/safety.md) before putting important data into production.
- Look up exact calls in your binding's chapter, such as [JavaScript](../bindings/javascript.md) or [Python](../bindings/python.md).
