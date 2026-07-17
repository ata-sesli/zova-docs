# Go

The Go package wraps Zova's C ABI through cgo. Go owns ergonomic handle and result types while the matching native archive supplies the storage engine.

## Install both layers

```sh
go get github.com/atasesli/zova/bindings/go@v0.23.0
```

Download the v0.23.0 C ABI archive for the target platform, then configure cgo:

```sh
CGO_CFLAGS="-I/absolute/path/to/zova-c-abi/include" \
CGO_LDFLAGS="-L/absolute/path/to/zova-c-abi/lib -lzova_c" \
go test ./...
```

The Go module, `zova.h`, and static library must come from the same release. CI and cross-compilation environments need the target-compatible native archive and C toolchain, not merely the Go package cache.

## Create and close a database

```go
package main

import zova "github.com/atasesli/zova/bindings/go"

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

Go covers relational statements, transactions, savepoints, objects, vectors, graphs, app events, operational copies, SQL-native helpers, and lifecycle methods for extensions present in the process registry.

Object, vector, and graph methods route through bound stores after open. Store create/bind/split/unbind management is CLI/native Zig-only in v0.23.0.

Dynamic external extension loading and app-defined callback authoring are not high-level Go APIs. Bundled/process-provided extensions remain usable through documented lifecycle methods.

Use the [C ABI chapter](./c-abi.md) when diagnosing link or ownership behavior beneath the Go wrapper.
