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

## API at a glance

The [tutorial](../get-started/first-database.md) uses most of these calls in complete programs. All methods are on `Database` unless a type is named.

| Task | Calls | Tutorial |
|---|---|---|
| Create or open a database | `Database.create(path)`, `Database.open(path, options?)`, `Database.createMemory()`, `close()` | [part 1](../get-started/first-database.md) |
| Run SQL | `exec(sql)`; `prepare(sql)` returns a `Statement` to `close()` | [part 1](../get-started/first-database.md) |
| Bind and read values | `bindText`, `bindInteger` (`bigint`), `bindFloat`, `bindBlob`, `bindNull`; `step()` returns `Step.Row` or `Step.Done`; `columnText`, `columnInteger`, `columnFloat`, `columnBlob` | [part 1](../get-started/first-database.md) |
| Group writes | `transaction(callback)`, `transactionImmediate(callback)`; `beginImmediate`, `commit`, `rollback`; `savepoint`, `rollbackToSavepoint`, `releaseSavepoint` | [part 2](../tutorial/search.md) |
| Store and read bytes | `putObject(bytes)`, `getObject(id)`, `readObjectRange(id, offset, size)`, `objectSize(id)`, `deleteObject(id)`, `objectIdToHex(id)` | [part 1](../get-started/first-database.md) |
| Stream large objects | `objectWriter()` with `write`, `finish`, `cancel`; `objectSeekableReader(id)` with `read`, `seek`, `close` | [guide](../guides/serve-object-ranges.md) |
| Key-value state | `kvPut(namespace, key, value)`, `kvGet(namespace, key)`, `kvDelete`, `kvPutMany`, `kvGetMany`, `kvCount` | [part 4](../tutorial/state.md) |
| Vectors | `createVectorCollection(name, { dimensions, metric, elementType })`, `putVectors(name, inputs)`, `searchVectors(name, query, { limit })`, `searchVectorsById(name, id, { limit })` | [part 2](../tutorial/search.md) |
| Graphs | `createGraph(name)`, `putGraphNode(node)`, `putGraphEdges(edges)`, `graphNeighbors(options)`, `graphWalk(options)` | [part 3](../tutorial/relate.md) |
| App events | `listen(channel)` returns a subscription with `tryReceive()` and `close()`; `notify(channel, payload)` | [part 4](../tutorial/state.md) |
| Copies and space | `backupTo(destination, verify?)`, `compactTo(destination, verify?)`, `restoreBackup(source, destination, verify?)`, `reclaimSpace(options?)` | [part 5](../tutorial/maintain.md) |
| Formats | `probeFormat(path)`, `migrateDatabase(source, destination, verify?, extensions?)`, `convertSqliteToZova` | [guide](../guides/migrate-format.md) |

`restoreBackup`, `probeFormat`, `migrateDatabase`, and `convertSqliteToZova` are module functions. Progress reporting and cancellation need `AsyncDatabase`, described below.

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

Queued operations include backup, compact, restore, `reclaimSpace`, format probe/migration, KV and event operations, vector batches and searches, and graph batches and walks.

`AsyncDatabase.backupTo`, `compactTo`, and `migrateDatabase` take `{ progress, signal }` options. Abort the signal or throw from the callback to cancel. The callback runs on the event loop after the native work reports an event, so cancellation takes effect at the next event.

```ts
const controller = new AbortController();
await db.backupTo("app.backup.zova", true, {
  progress: (event) => console.log(event.phase, event.done, event.total),
  signal: controller.signal,
});
```

Both facades also provide `reclaimSpace({ maxPages, stepPages })` and an `ObjectSeekableReader` for seekable, chunk-verified reads: `Database.objectSeekableReader(id)` with `read`/`seek`, and `AsyncDatabase.objectSeekableReader(id)` whose `readAsync`/`seekAsync` run on the worker pool in call order. Close each reader with `close()`. `migrateDatabase(source, destination, verify, extensions)` accepts the same `ExtensionOptions` as `Database.open`. Async transaction callbacks and prepared statement handles are not exposed.

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

## Trusted extension bundles

Both handle types accept trusted `.zovaext` bundles at create/open:

```ts
const extensions = { bundlePaths: ["./search.zovaext"] };
const db = Database.create("app.zova", extensions);
db.installExtension("search");
db.close();
const reopened = Database.open("app.zova", { readOnly: true, extensions });
```

`AsyncDatabase.create` and `AsyncDatabase.open` accept the same options. Set `trustStorePath` in the extension options for a non-default trust store. Trust the bundle first with `zova extension trust ./search.zovaext`; opening never grants trust or loads paths from database metadata. Native code and its dependencies must match the host. Closing releases callback state before unloading libraries.

Extension authoring, application SQL callbacks, and explicit extension-data upgrades have no JavaScript wrapper.

## Low-level graph surfaces

Advanced opaque graph keys, topology scans, edge payloads, and fresh-build sessions remain stable low-level C ABI and raw `zova-sys` capabilities. Their omission from the high-level JavaScript API is deliberate.
