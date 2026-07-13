# Go

The Go package uses cgo over the stable C header and static library.

```go
package main

import zova "github.com/atasesli/zova/bindings/go"

func main() {
    db, err := zova.Create("app.zova")
    if err != nil { panic(err) }
    defer db.Close()
    if err := db.Exec("create table notes(id integer primary key, body text)"); err != nil { panic(err) }
}
```

## Link the native archive

```sh
CGO_CFLAGS="-I/path/to/zova-c-abi/include" \
CGO_LDFLAGS="-L/path/to/zova-c-abi/lib -lzova_c" \
go test ./...
```

Match the archive to Zova v0.23.0 and the target platform. One `Database` handle serializes calls; multiple handles follow SQLite locking behavior.

Go covers relational operations, savepoints, events, operations, objects, vectors, graphs, and extension lifecycle features exposed by the C ABI. Store management remains CLI/native Zig-only in v0.23.

