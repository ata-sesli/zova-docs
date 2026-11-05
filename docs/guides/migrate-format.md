import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Upgrade an older Zova file

Each Zova release reads one storage format. Zova 1.4.0 writes format 13 and refuses to open a file in an older format, with `ZOVA_MIGRATION_REQUIRED`. Upgrading is an explicit, offline copy: you migrate the file to a new path, check the result, and switch to it. The source file is never changed, so it stays your rollback.

## Step 1: Check the format

```sh
zova format app.zova
```

For a file written by an older release, the report says what to do:

```text
source: app.zova
source_format: 11
current_format: 13
minimum_migratable_format: 9
compatibility: migratable
recommended_action: run 'zova migrate <source> <destination>'
```

`compatibility` is one of four classes:

| Class | Meaning |
|---|---|
| `current` | this release opens the file directly; nothing to do |
| `migratable` | `zova migrate` can copy it forward |
| `unsupported_legacy` | older than `minimum_migratable_format`; this release cannot migrate it |
| `unsupported_future` | written by a newer release; open it with that release |

Probing never writes to the file, so it is safe to run on a database that is in use.

## Step 2: Rehearse the migration

```sh
zova migrate --dry-run app.zova app-format-13.zova
```

A dry run performs every check a real migration does, including destination, free space, bound stores, and extensions, without writing anything:

```text
migrate --dry-run: ok
source: app.zova
destination: app-format-13.zova
source_format: 11
destination_format: 13
compatibility: migratable
verify: true
preflight: passed
member main: app.zova -> app-format-13.zova (copy 917504 bytes, 368640 free)
recovery_directory: app-format-13.zova.migration-recovery
copy_bytes: 917504
destination_free_bytes: 10651275264
extension trgm 0.1.0: bundled
note: migration copies 368640 free bytes as is; 'zova compact' first would shrink the copy
```

It exits `0` when the migration would pass, and otherwise exits with the code the migration would return, naming the first failing check. A database with an extension that is not bundled with Zova needs `--extension <bundle.zovaext>`; see [Extensions](./extensions.md).

## Step 3: Migrate and check

Stop every process that writes to the file, keep a backup, then run:

```sh
zova migrate app.zova app-format-13.zova
zova check --deep app-format-13.zova
```

```text
migrate: ok
source: app.zova
destination: app-format-13.zova
source_format: 11
destination_format: 13
verified: true
```

`migrate` verifies the destination by reopening it, and `check --deep` validates every store. Point the application at the new file once both pass.

## Step 4: Compact the migrated file

Migration copies every page, free pages included, and keeps the source's SQLite auto-vacuum mode, so a migrated file cannot use [in-place reclaim](./reclaim-space.md). Compact it once:

```sh
zova compact app-format-13.zova app-compact.zova
zova check --deep app-compact.zova
```

In this example the compacted copy is 578 KB instead of 917 KB, and it uses incremental auto-vacuum, so `zova reclaim` keeps it small from then on. The 1.4.0 CLI cannot compact the old file before migrating, because it does not open older formats.

## Migrate from code

An application can probe at startup and migrate when it finds an older file:

<Tabs groupId="programming-languages" defaultValue="javascript">
  <TabItem value="javascript" label="JavaScript">

```js title="upgrade.mjs"
import { migrateDatabase, probeFormat } from "zova-js";

const info = probeFormat("app.zova");
console.log(`format ${info.formatVersion}: ${info.compatibility}`);
if (info.compatibility === "migratable") {
  migrateDatabase("app.zova", "app-format-13.zova");
  console.log("migrated to app-format-13.zova");
}
```

  </TabItem>
  <TabItem value="python" label="Python">

```python title="upgrade.py"
import zova

info = zova.probe_format("app.zova")
print(f"format {info.format_version}: {info.compatibility.name.lower()}")
if info.compatibility == zova.FormatCompatibility.MIGRATABLE:
    zova.migrate_database("app.zova", "app-format-13.zova")
    print("migrated to app-format-13.zova")
```

  </TabItem>
  <TabItem value="rust" label="Rust">

```rust title="src/bin/upgrade.rs"
use zova::{migrate_database, probe_format, FormatCompatibility, MigrateOptions};

fn main() -> Result<(), zova::Error> {
    let info = probe_format("app.zova")?;
    println!("format {}: {:?}", info.format_version, info.compatibility);
    if info.compatibility == FormatCompatibility::Migratable {
        migrate_database("app.zova", "app-format-13.zova", MigrateOptions::default())?;
        println!("migrated to app-format-13.zova");
    }
    Ok(())
}
```

  </TabItem>
  <TabItem value="go" label="Go">

```go title="upgrade/main.go"
package main

import (
	"fmt"
	"log"

	zova "github.com/ata-sesli/zova/bindings/go"
)

func main() {
	info, err := zova.ProbeFormat("app.zova")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("format %d: %s\n", info.FormatVersion, zova.FormatCompatibilityName(info.Compatibility))
	if info.Compatibility == zova.FormatMigratable {
		if err := zova.MigrateDatabase("app.zova", "app-format-13.zova"); err != nil {
			log.Fatal(err)
		}
		fmt.Println("migrated to app-format-13.zova")
	}
}
```

  </TabItem>
</Tabs>

For a format-11 file, the program prints:

```text
format 11: migratable
migrated to app-format-13.zova
```

Rust prints the class as `Migratable`. Like the CLI, the call refuses an existing destination and removes partial output when it fails. Progress forms such as `migrate_database_with_progress` and extension-aware forms are listed in [Compatibility](../operations/compatibility.md#migration-rules).

## If a migration is interrupted

An interrupted run can leave a `<destination>.migration-recovery/` directory. Do not delete it by hand; follow [Compatibility](../operations/compatibility.md#migration-rules), which describes the release's recovery script.
