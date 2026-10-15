# Go

The Go package wraps Zova's C ABI through cgo. Go owns ergonomic handle and result types while the matching native archive supplies the storage engine.

## Install both layers

```sh
go get github.com/ata-sesli/zova/bindings/go@v1.3.0
```

Download the v1.3.0 C ABI archive for the target platform, then configure cgo. Linux and macOS archives bundle the compiler-runtime helpers they need, so the system C toolchain can link them:

```sh
CGO_CFLAGS="-I/absolute/path/to/zova-c-abi/include" \
CGO_LDFLAGS="-L/absolute/path/to/zova-c-abi/lib -lzova_c" \
go test ./...
```

The Go module, `zova.h`, and static library must come from the same release. CI and cross-compilation environments need the target-compatible native archive and C toolchain, not merely the Go package cache.

## Create and close a database

```go
package main

import zova "github.com/ata-sesli/zova/bindings/go"

func main() {
    db, err := zova.Create("app.zova")
    if err != nil {
        panic(err)
    }
    defer db.Close()

    if err := db.Exec(
        "create table notes(id integer primary key, body text not null)",
    ); err != nil {
        panic(err)
    }
}
```

Close databases, statements, writers, listeners, and owned results promptly. A deferred close is appropriate after successful construction; handle close errors explicitly in code where finalization failure affects the operation.

## Concurrency model

Calls through one `Database` handle are serialized at the native boundary. Goroutines can share according to the binding contract, but one handle does not execute SQLite work in parallel. Open multiple handles for actual SQLite concurrency and expect normal locking and busy behavior.

Keep a transaction's related calls on the intended handle and use the binding's transaction helpers so scopes cannot be accidentally spread across unrelated connections.

## Feature coverage

Go covers relational statements, transactions, savepoints, in-memory databases, binary KV, objects, vectors, graphs, app events, format probe/migration, operational copies, SQL-native helpers, and lifecycle methods for extensions present in the process registry.

Object, vector, and graph methods route through bound stores after open. Store create/bind/split/unbind management is CLI/native Zig-only in v1.3.0.

Bundled/process-provided extensions remain usable through documented lifecycle methods. Since 1.2.0, Go also selects trusted `.zovaext` bundles at create/open:

```go
extensions := zova.ExtensionOptions{BundlePaths: []string{"./search.zovaext"}}
db, err := zova.CreateWithExtensions("app.zova", extensions)
// Reopen: zova.OpenWithExtensions(path, zova.OpenOptions{}, extensions).
```

Set `TrustStorePath` for a non-default trust store. Trust the bundle first with `zova extension trust ./search.zovaext`; opening never grants trust. Code and dependencies must match the host. `DB.Close` releases child handles before unloading libraries.

App-defined scalar callbacks and explicit extension-data upgrades are not high-level Go APIs.

Use the [C ABI chapter](./c-abi.md) when diagnosing link or ownership behavior beneath the Go wrapper.
