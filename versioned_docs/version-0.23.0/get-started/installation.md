import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Installation

Choose the highest-level binding that fits your application. Every binding uses the same Zova file format and storage engine; packaging, ownership conventions, and access to low-level host features differ.

## Choose a path

| Application | Recommended package | Native dependency model |
|---|---|---|
| Rust | `zova` | builds bundled generated C |
| Python | `zova` wheel | native extension included on supported targets |
| Go | Go module + C ABI archive | cgo links the matching static library |
| C or another FFI language | C ABI archive | include `zova.h` and link `libzova_c` |
| Zig or Zova development | source package | build the native project with Zig |
| Operations only | CLI archive | standalone executable |

Use `zova-sys` only when a Rust application specifically needs the raw C ABI. Use a native Zig-built artifact when external `.zovaext` loading is required; generated-C package snapshots intentionally report dynamic loading as unavailable.

## Install or build for your language

<Tabs groupId="programming-languages" defaultValue="rust">
  <TabItem value="rust" label="Rust">

```sh
cargo add zova@0.23.0
```

  </TabItem>
  <TabItem value="python" label="Python">

```sh
uv add zova==0.23.0
# or
python -m pip install zova==0.23.0
```

  </TabItem>
  <TabItem value="go" label="Go">

```sh
go get github.com/atasesli/zova/bindings/go@v0.23.0
```

  </TabItem>
  <TabItem value="c" label="C ABI">

Download the matching C ABI archive, then include its public header:

```c
#include "zova.h"
```

  </TabItem>
  <TabItem value="zig" label="Zig">

```sh
zig build
zig build c-abi
```

  </TabItem>
</Tabs>

## Rust

Or pin the version explicitly:

```toml
[dependencies]
zova = "=0.23.0"
```

The safe crate builds the bundled generated-C native layer. Consumers need Rust 1.79 or newer and a C compiler, but not Zig.

Verify the installation:

```rust
use zova::Database;

fn main() -> Result<(), zova::Error> {
    let mut db = Database::create("smoke.zova")?;
    db.exec("create table notes(id integer primary key, body text)")?;
    Ok(())
}
```

```sh
cargo run
```

Continue with the [Rust binding guide](../bindings/rust.md).

## Python

Published wheels target Linux and macOS, x86_64 and arm64, on CPython 3.10 and 3.12. A matching wheel needs no compiler. If package installation selects the source distribution, the machine needs Rust and a C compiler.

Verify the import and file creation:

```python
import zova

with zova.Database.create("smoke.zova") as db:
    db.exec("create table notes(id integer primary key, body text)")
```

Use context managers so native handles close deterministically. Continue with the [Python binding guide](../bindings/python.md).

## Go

The Go package calls Zova through cgo. Download the v0.23.0 C ABI archive matching the target operating system and architecture, then point the build at its directories:

<Tabs groupId="operating-systems" defaultValue="macos-linux">
  <TabItem value="macos-linux" label="macOS / Linux">

```sh
CGO_CFLAGS="-I/absolute/path/to/zova-c-abi/include" \
CGO_LDFLAGS="-L/absolute/path/to/zova-c-abi/lib -lzova_c" \
go test ./...
```

  </TabItem>
  <TabItem value="windows" label="Windows">

```powershell
$env:CGO_CFLAGS = "-IC:\path\to\zova-c-abi\include"
$env:CGO_LDFLAGS = "-LC:\path\to\zova-c-abi\lib -lzova_c"
go test ./...
```

  </TabItem>
</Tabs>

Keep the Go module, header, and library on the same Zova version. See the [Go binding guide](../bindings/go.md) for handle and deployment behavior.

## CLI and C ABI archives

Download the target archive from the [v0.23.0 GitHub release](https://github.com/ata-sesli/zova/releases/tag/v0.23.0). CLI and C ABI packages are separate artifacts.

After extracting the CLI, verify it:

```sh
zova --version
zova --help
```

The C ABI archive contains `zova.h` and the static library. Add the include path to compilation and the library path to linking; do not combine files from different releases.

## Build from source

Source builds require Zig 0.16.0 or newer and a C compiler:

```sh
zig build
zig build c-abi
```

Use source builds for Zova development, unsupported targets, or native extension-host requirements. A system SQLite installation is not needed; Zova vendors SQLite 3.53.2.

## Confirm what you installed

Before integrating important data:

1. Create a disposable database.
2. Write and read one application row.
3. Run `zova check --deep` with the matching CLI when available.
4. Confirm the artifact reports v0.23.0.
5. Record the package and native artifact versions in the application build.

Then follow [Build your first database](./first-database.md).
