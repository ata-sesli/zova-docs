import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Reclaim disk space

Deleting rows, objects, vectors, or graph data frees pages *inside* a `.zova` file, but the file does not shrink. SQLite keeps those pages on a freelist and reuses them for later writes. This guide returns them to the filesystem, either in place with `reclaim` or by writing a compact copy.

## Pick the method

| File | Method | What happens |
|---|---|---|
| created by Zova 1.4.0, split from one, or written by `compact` | `zova reclaim` | releases free pages in place, in short steps, while the database stays usable |
| migrated from an earlier format, or converted from SQLite | `zova compact` once | writes a verified copy without free pages; the copy uses incremental mode, so later space comes back with `reclaim` |

The difference is SQLite's **auto-vacuum mode**. In-place reclaim needs `incremental` mode, and SQLite can change the mode of an existing file only by rewriting it. Migration, backup, restore, and conversion keep the source file's mode, so a file that started in `none` mode stays there until it is compacted.

## Reclaim in place

```sh
zova reclaim app.zova
zova reclaim --json --max-pages 100000 app.zova
```

For each member file, the main database and any bound object, vector, or graph store, the report lists the auto-vacuum mode, page size, pages and bytes released, and free pages left. Each step is its own write transaction of at most 1024 pages, so other readers and writers run between steps. `--max-pages` caps the total for one run, which keeps a scheduled maintenance job short.

The same call is available in code. This program releases up to 100,000 pages and reports any member that needs compacting:

<Tabs groupId="programming-languages" defaultValue="javascript">
  <TabItem value="javascript" label="JavaScript">

```js title="reclaim.mjs"
import { Database } from "zova-js";

const db = Database.open("app.zova");
for (const member of db.reclaimSpace(100_000)) {
  console.log(
    `${member.member}: ${member.autoVacuum}, released ${member.pagesReleased} pages, ` +
      `${member.freePagesLeft} free pages left`,
  );
  if (member.autoVacuum === "none" && member.freePagesLeft > 0) {
    console.log("  this member needs `zova compact` once");
  }
}
db.close();
```

`reclaimSpace(maxPages, stepPages)` is also available on `AsyncDatabase`.

  </TabItem>
  <TabItem value="python" label="Python">

```python title="reclaim.py"
import zova

db = zova.Database.open("app.zova")
for member in db.reclaim_space(max_pages=100_000):
    print(f"{member.member}: {member.auto_vacuum}, released {member.pages_released} pages, "
          f"{member.free_pages_left} free pages left")
    if member.auto_vacuum == "none" and member.free_pages_left > 0:
        print("  this member needs `zova compact` once")
db.close()
```

  </TabItem>
  <TabItem value="rust" label="Rust">

```rust title="src/bin/reclaim.rs"
use zova::{AutoVacuum, Database, ReclaimOptions};

fn main() -> Result<(), zova::Error> {
    let mut db = Database::open("app.zova")?;
    let options = ReclaimOptions { max_pages: 100_000, ..Default::default() };
    for member in db.reclaim_space(options)? {
        println!(
            "{:?}: {}, released {} pages, {} free pages left",
            member.member,
            member.auto_vacuum.name(),
            member.pages_released,
            member.free_pages_left
        );
        if member.auto_vacuum == AutoVacuum::None && member.free_pages_left > 0 {
            println!("  this member needs `zova compact` once");
        }
    }
    Ok(())
}
```

  </TabItem>
  <TabItem value="go" label="Go">

```go title="reclaim/main.go"
package main

import (
	"fmt"
	"log"

	zova "github.com/ata-sesli/zova/bindings/go"
)

func main() {
	db, err := zova.Open("app.zova")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	reclaimed, err := db.ReclaimSpace(zova.ReclaimOptions{MaxPages: 100_000})
	if err != nil {
		log.Fatal(err)
	}
	for i, member := range reclaimed {
		fmt.Printf("member %d: released %d pages, %d free pages left\n",
			i, member.PagesReleased, member.FreePagesLeft)
		if member.AutoVacuum == zova.AutoVacuumNone && member.FreePagesLeft > 0 {
			fmt.Println("  this member needs `zova compact` once")
		}
	}
}
```

Members are reported in a fixed order: the main database, then each bound object, vector, and graph store.

  </TabItem>
</Tabs>

On a file in incremental mode with 2,228 free pages, the program prints:

```text
main: incremental, released 2228 pages, 0 free pages left
```

Rust prints the member as `Main`, and Go prints `member 0`. Calling reclaim inside an open transaction fails with `ZOVA_OBJECT_TRANSACTION_ACTIVE`; open object readers are allowed.

## Compact a file once

A file in `none` mode releases nothing, and the CLI says so:

```text
member: main
  auto_vacuum: none
  page_size: 4096
  pages_released: 0
  bytes_released: 0
  free_pages_left: 2228
  note: auto_vacuum is none; 'zova compact' writes an incremental copy that can reclaim
```

Write a compact copy, check it, and switch to it while no process has the original open:

```sh
zova compact app.zova app.compact.zova
zova check --deep app.compact.zova
zova reclaim app.compact.zova
```

`compact` runs SQLite `VACUUM INTO`, verifies the copy, and refuses an existing destination. In the example above, a converted 9.3 MB file whose rows had been deleted compacted to 172 KB, and `reclaim` on the copy reports `auto_vacuum: incremental`. From then on, `reclaim` keeps the file small without another copy.

The bindings call the same operation `compact_to` (Rust and Python), `CompactTo` (Go), and `compactTo` (JavaScript). Each has a progress form; see [Progress and cancellation](../operations/safety.md#progress-and-cancellation).

## Related

- [Operational safety](../operations/safety.md#reclaim-free-pages-in-place) explains how backup, compact, restore, and reclaim differ.
- [Upgrade an older Zova file](./migrate-format.md) migrates a file forward; compact it afterwards to switch it to incremental mode.
- [Tutorial part 5](../tutorial/maintain.md) deletes a large object and reclaims its pages.
