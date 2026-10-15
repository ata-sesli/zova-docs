# JavaScript and TypeScript

The `zova-js` package provides synchronous and queued asynchronous Node-API bindings with bundled TypeScript declarations. It uses the same native Zova engine and file format as the other bindings.

## Install

```sh
bun add zova-js
# or
npm install zova-js
```

Prebuilt packages support Node.js 22 and 24 and Bun on:

- macOS arm64 and x86_64;
- glibc Linux arm64 and x86_64; and
- Windows x86_64 with MSVC.

Electron, Deno, browser use of this native addon, musl Linux, and Windows arm64 are not claimed. A supported prebuilt installation does not need Zig, Rust, a C compiler, or an install-time native download. Browser applications can use the separate experimental [WebAssembly package](./wasm.md).

## Synchronous database

`Database` exposes SQL statements, transactions, savepoints, in-memory databases, backup and restore, binary KV, app events, objects, typed vectors, public graph operations, format probe/migration, and bundled extension lifecycle.

```ts
import { Database, Step } from "zova-js";

const db = Database.create("app.zova");
db.exec("create table notes(id integer primary key, body text not null)");

const insert = db.prepare("insert into notes(body) values (?1)");
insert.bindText(1, "hello");
if (insert.step() !== Step.Done) {
  throw new Error("insert did not finish");
}
insert.close();

db.transaction((transaction) => {
  transaction.exec("insert into notes(body) values ('committed')");
});

db.close();
```

Transaction and savepoint callbacks are synchronous. Returning a Promise is rejected before commit, and throwing rolls the scope back.

## Queued asynchronous database

`AsyncDatabase` runs native work on the Node worker pool while preserving FIFO order for each database. It rejects new work after closing begins, waits for already queued work, and closes once.

```ts
import { AsyncDatabase } from "zova-js";

const db = AsyncDatabase.create("app.zova");
await db.exec("create table notes(body text)");
const objectId = await db.putObject(
  new TextEncoder().encode("large bytes"),
);
const bytes = await db.getObject(objectId);
console.log(bytes.byteLength);
await db.close();
```

Queued operations include backup, compact, restore, format probe/migration, KV and event operations, vector batches and searches, and graph batches and walks. Async transaction callbacks and prepared statement handles are not exposed.

## Data mappings

| Zova value | JavaScript value |
|---|---|
| SQL integer, count, or identity | `bigint` |
| blob or object bytes | `Uint8Array` |
| `f32` vector | `Float32Array` |
| raw `f16` elements | `Uint16Array` |
| `i8` vector | `Int8Array` |
| nullable SQL data | `null` |
| absent option | `undefined` |

## Ownership and errors

Close `Statement`, `ObjectWriter`, and `Database` values explicitly. Node-API finalizers are fallback cleanup, not the primary lifecycle.

Native failures are exposed as `ZovaError` with the Zova status name, numeric status, and native message.

```ts
import { Database, ZovaError } from "zova-js";

const db = Database.create("app.zova");

try {
  db.exec("select * from missing");
} catch (error) {
  if (error instanceof ZovaError) {
    console.error(error.code, error.status, error.message);
  }
}

db.close();
```

Advanced opaque graph keys, topology scans, edge payloads, and fresh-build sessions remain stable low-level C ABI and raw `zova-sys` capabilities. Their omission from the high-level JavaScript API is deliberate.
