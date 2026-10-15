import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Installation

Choose the highest-level binding that fits your application. Every binding uses the same Zova file format and storage engine; packaging, ownership conventions, and access to low-level host features differ.

## Choose a path

| Application | Recommended package | Native dependency model |
|---|---|---|
| JavaScript or TypeScript | `zova-js` | prebuilt Node-API package on supported targets |
| Browser JavaScript or TypeScript | `zova-wasm` | experimental browser ESM, worker, and WebAssembly package |
| Rust | `zova` | builds bundled generated C |
| Python | `zova` wheel | native extension included on supported targets |
| Go | Go module + C ABI archive | cgo links the matching static library |
| C or another FFI language | C ABI archive | include `zova.h` and link `libzova_c` |
| Zig or Zova development | source package | build the native project with Zig |
| Operations only | CLI archive | standalone executable |

Use `zova-sys` only when a Rust application specifically needs the raw C ABI. Use a native Zig-built artifact when external `.zovaext` loading is required; generated-C package snapshots intentionally report dynamic loading as unavailable.

## Install or build for your language

<Tabs groupId="programming-languages" defaultValue="javascript">
  <TabItem value="javascript" label="JavaScript / TypeScript">

```sh
bun add zova-js
# or
npm install zova-js
```

  </TabItem>
  <TabItem value="rust" label="Rust">

```sh
cargo add zova@1.1.0
```

  </TabItem>
  <TabItem value="python" label="Python">

```sh
uv add zova==1.1.0
# or
python -m pip install zova==1.1.0
```

  </TabItem>
  <TabItem value="go" label="Go">

```sh
go get github.com/ata-sesli/zova/bindings/go@v1.1.0
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

## JavaScript and TypeScript

`zova-js` ships TypeScript declarations and prebuilt Node-API packages for Node.js 22 and 24 and Bun on supported macOS, glibc Linux, and Windows targets. A prebuilt installation needs no Zig, Rust, C compiler, or install-time native download.

```ts
import { Database } from "zova-js";

const db = Database.create("smoke.zova");
db.exec("create table notes(id integer primary key, body text)");
db.close();
```

Electron, Deno, browser use of this native addon, musl Linux, and Windows arm64 are not claimed. Browser applications can use the separate experimental [`zova-wasm` package](../bindings/wasm.md) for SQL and binary KV.

## Rust

Or pin the version explicitly:

```toml
[dependencies]
zova = "=1.1.0"
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

Published stable-ABI wheels target Linux and macOS on x86_64 and arm64, plus Windows x86_64. They require Python 3.13 or newer and are tested on CPython 3.13 and 3.14. A matching wheel needs no compiler; Zova does not publish a Python source distribution.

Verify the import and file creation:

```python
import zova

with zova.Database.create("smoke.zova") as db:
    db.exec("create table notes(id integer primary key, body text)")
```

Use context managers so native handles close deterministically. Continue with the [Python binding guide](../bindings/python.md).

## Go

The Go package calls Zova through cgo. Download the v1.1.0 C ABI archive matching the target operating system and architecture, then point the build at its directories:

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

Download the target archive from the [v1.1.0 GitHub release](https://github.com/ata-sesli/zova/releases/tag/v1.1.0). CLI and C ABI packages are separate artifacts.

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

Use source builds for Zova development, unsupported targets, or native extension-host requirements. A system SQLite installation is not needed; Zova vendors SQLite 3.53.4.

## Confirm what you installed

Before integrating important data:

1. Create a disposable database.
2. Write and read one application row.
3. Run `zova check --deep` with the matching CLI when available.
4. Confirm the artifact reports v1.1.0.
5. Record the package and native artifact versions in the application build.

Then follow [Build your first database](./first-database.md).
