# Go

The Go package wraps Zova's C ABI through cgo. Go owns ergonomic handle and result types while the matching native archive supplies the storage engine.

## Install both layers

```sh
go get github.com/ata-sesli/zova/bindings/go@v1.4.0
```

Download the v1.4.0 C ABI archive for the target platform, then configure cgo. Linux and macOS archives bundle the compiler-runtime helpers they need, so the system C toolchain can link them:

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

## API at a glance

The [tutorial](../get-started/first-database.md) uses most of these calls in complete programs. Methods are on `*zova.DB` unless a package function or type is named.

| Task | Calls | Tutorial |
|---|---|---|
| Create or open a database | `zova.Create(path)`, `zova.Open(path)`, `zova.OpenWithOptions(path, options)`, `zova.CreateMemory()`, `Close()` | [part 1](../get-started/first-database.md) |
| Run SQL | `Exec(sql)`; `Prepare(sql)` returns a `*Stmt` to `Close()` | [part 1](../get-started/first-database.md) |
| Bind and read values | `BindText`, `BindInt64`, `BindFloat64`, `BindBlob`, `BindNull`; `Step()` returns `zova.StepRow` or `zova.StepDone`; `ColumnText` and `ColumnBlob` return `(value, ok, err)`; `ColumnInt64` and `ColumnFloat64` return `(value, err)` | [part 1](../get-started/first-database.md) |
| Group writes | `BeginImmediate`, `Commit`, `Rollback`; `Savepoint`, `RollbackToSavepoint`, `ReleaseSavepoint`, `WithSavepoint` | [part 2](../tutorial/search.md) |
| Store and read bytes | `PutObject(data)`, `GetObject(id)`, `ReadObjectRange`, `ObjectSize(id)`, `DeleteObject(id)`; `zova.ObjectID` is a `[32]byte` | [part 1](../get-started/first-database.md) |
| Stream large objects | `ObjectWriter()`; `ObjectSeekableReader(id)`, an `io.ReadSeeker` and `io.Closer` | [guide](../guides/serve-object-ranges.md) |
| Key-value state | `KvPut(namespace, key, value)`, `KvGet(namespace, key)`, `KvDelete`, `KvPutMany`, `KvGetMany`, `KvCount` | [part 4](../tutorial/state.md) |
| Vectors | `CreateVectorCollection(name, zova.VectorCollectionOptions{...})`, `PutVectors(name, inputs)`, `SearchVectors(name, values, limit)`, `SearchVectorsByID(name, id, limit)` | [part 2](../tutorial/search.md) |
| Graphs | `CreateGraph(name)`, `PutGraphNode(zova.GraphNodeInput{...})`, `PutGraphEdge(zova.GraphEdgeInput{...})`, `GraphNeighbors(zova.GraphNeighborsOptions{...})`, `GraphWalk(zova.GraphWalkOptions{...})` | [part 3](../tutorial/relate.md) |
| App events | `Listen(channel)` returns a subscription with `TryReceive()` and `Close()`; `Notify(channel, payload)` | [part 4](../tutorial/state.md) |
| Copies and space | `BackupTo`, `BackupToWithProgress`, `CompactTo`, `CompactToWithProgress`, `ReclaimSpace(options...)`; package function `zova.RestoreBackup` | [part 5](../tutorial/maintain.md) |
| Formats | package functions `zova.ProbeFormat`, `MigrateDatabase`, `MigrateDatabaseWithProgress`, `MigrateDatabaseWithExtensions`, `ConvertSqliteToZova` | [guide](../guides/migrate-format.md) |

Optional string fields in Go option structs, such as `TargetNamespace` and `EdgeType`, are `*string`.

## Concurrency model

Calls through one `Database` handle are serialized at the native boundary. Goroutines can share according to the binding contract, but one handle does not execute SQLite work in parallel. Open multiple handles for actual SQLite concurrency and expect normal locking and busy behavior.

Keep a transaction's related calls on the intended handle and use the binding's transaction helpers so scopes cannot be accidentally spread across unrelated connections.

## Feature coverage

Go covers relational statements, transactions, savepoints, in-memory databases, binary KV, objects, vectors, graphs, app events, format probe/migration, operational copies, SQL-native helpers, and lifecycle methods for extensions present in the process registry.

Go also provides `ReclaimSpace`, `ObjectSeekableReader`, `BackupToWithProgress`, `CompactToWithProgress`, `MigrateDatabaseWithProgress`, and `MigrateDatabaseWithExtensions(source, destination, options, extensions)`. A progress callback returns an error to cancel. The seekable reader is an `io.ReadSeeker` and `io.Closer`:

```go
reader, err := db.ObjectSeekableReader(objectID)
if err != nil {
    log.Fatal(err)
}
defer reader.Close()
http.ServeContent(w, r, "video.mp4", time.Time{}, reader)
```

`ReclaimSpace()` returns one `ReclaimedMember` per member file with `PagesReleased` and `FreePagesLeft`; pass `ReclaimOptions{MaxPages: n}` to cap one call.

Object, vector, and graph methods route through bound stores after open. Store create/bind/split/unbind management is CLI/native Zig-only.

Bundled/process-provided extensions remain usable through documented lifecycle methods. Go also selects trusted `.zovaext` bundles at create/open:

```go
extensions := zova.ExtensionOptions{BundlePaths: []string{"./search.zovaext"}}
db, err := zova.CreateWithExtensions("app.zova", extensions)
// Reopen: zova.OpenWithExtensions(path, zova.OpenOptions{}, extensions).
```

Set `TrustStorePath` for a non-default trust store. Trust the bundle first with `zova extension trust ./search.zovaext`; opening never grants trust. Code and dependencies must match the host. `DB.Close` releases child handles before unloading libraries.

App-defined scalar callbacks and explicit extension-data upgrades are not high-level Go APIs.

Use the [C ABI chapter](./c-abi.md) when diagnosing link or ownership behavior beneath the Go wrapper.
