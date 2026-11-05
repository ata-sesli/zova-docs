# Browser WebAssembly

`zova-wasm` is the experimental browser package for Zova. It provides SQL, binary KV, transactions, prepared statements, objects, exact vectors, and graphs in memory or in named OPFS storage. It runs the real Zova core and bundled SQLite inside a dedicated worker as one WebAssembly module.

Browser API stability and full native parity are outside the stable 1.x native contract.

## Install and run

```sh
bun add zova-wasm
# or
npm install zova-wasm
```

Serve the application over HTTPS or localhost with module workers and WebAssembly enabled. The worker and WASM assets resolve relative to the package and must remain together when deployed.

```ts
import { Database } from "zova-wasm";

const db = await Database.createMemory();
try {
  await db.exec("create table tasks(id integer, title text)");
  await db.query("insert into tasks values (?, ?)", [1n, "Try browser Zova"]);
  const result = await db.query("select id, title from tasks");
  console.log(result.rows);

  const encode = (text: string) => new TextEncoder().encode(text);
  await db.kv.put(encode("settings"), encode("theme"), encode("sage"));
} finally {
  await db.close();
}
```

Memory database contents disappear when the database closes or its worker/page terminates.

## Named OPFS databases

```ts
const db = await Database.openPersistent("my-app");
try {
  await db.exec("create table if not exists tasks(id integer primary key)");
} finally {
  await db.close();
}
```

Persistent opening requires a secure context, dedicated workers, Web Locks, and OPFS synchronous access handles. Names are case-sensitive, 1–64 ASCII letters, digits, underscores, or hyphens, beginning with a letter or digit.

Opening validates an existing file without migrating it. Since 1.2.0, opening may first recover an abandoned SQLite rollback journal left by a terminated worker, restoring committed state. This is transaction recovery, not a format migration.

One owner may open a name at a time. A competing tab or worker receives `ZOVA_BUSY`; wait for the owner to close before retrying with a bounded delay. Different names can be open concurrently.

OPFS data belongs to the browser origin and profile. Site-data clearing, browser eviction, storage limits, or an origin change can remove or isolate it. `openPersistent()` does not grant persistent-storage permission. Use [export and import](#export-and-import) to copy data out of browser storage; nothing is exported automatically.

## Transactions

```ts
const moved = await db.transaction(async (tx) => {
  await tx.query("update accounts set balance = balance - ? where id = ?", [10n, 1n]);
  await tx.kv.put(namespace, key, value);
  return "moved";
});
```

`transaction()` begins an immediate transaction and runs the callback with a handle scoped to it. It commits when the callback resolves and rolls back when it throws, rethrowing the error. SQL, KV, object, vector, and graph writes made through `tx` commit or roll back together.

Calls made on `db` while a transaction runs wait until it ends, so awaiting `db` instead of `tx` inside the callback never completes. Transactions cannot be nested, and `tx` rejects after its transaction ends.

## Prepared statements

```ts
const insert = await db.prepare("insert into tasks values (?, ?)");
await insert.query([2n, "Reuse the plan"]);
await insert.finalize();

const select = await db.prepare("select id, title from tasks where id >= ?");
for await (const row of select.iterate([1n], 100)) console.log(row);
await select.finalize();
```

`query()` rebinds, runs to completion, and returns every row. `iterate()` fetches rows in batches (256 by default) and resets the statement when the loop ends or is abandoned. A statement has one cursor: finish one `query()` or `iterate()` before starting another on the same statement. `finalize()` is idempotent, and closing the database finalizes its statements.

## Objects, vectors, and graphs

```ts
const id = await db.putObject(bytes);
const tail = await db.readObjectRange(id, 1024n, 4096);

await db.createVectorCollection("docs", { dimensions: 3, metric: "cosine", elementType: "f32" });
await db.putVectors("docs", [{ id: "a", values: new Float32Array([1, 0, 0]) }]);
const hits = await db.searchVectors("docs", new Float32Array([1, 0, 0]), 5);

await db.createGraph("links");
await db.putGraphNodes([
  { graphName: "links", nodeId: "a", kind: "page", targetType: "none" },
  { graphName: "links", nodeId: "b", kind: "page", targetType: "none" },
]);
await db.putGraphEdge({ graphName: "links", fromNodeId: "a", edgeType: "cites", toNodeId: "b" });
const reached = await db.graphWalk({ graphName: "links", startNodeId: "a", maxDepth: 2, limit: 100 });
```

Method names and result shapes follow the native [`zova-js` package](./javascript.md). Vector search is exact. Counts and sizes are `bigint`. Whole objects and result lists cross the worker boundary in one message, so keep individual objects and result limits modest.

## Export and import

```ts
const bytes = await db.export();
const copy = await Database.importPersistent("restored", bytes);
```

`export()` returns the committed bytes of a persistent database. It rejects while a transaction is open and for memory databases. `importPersistent()` creates a new named database from those bytes and opens it with normal validation. It rejects with `ZOVA_DESTINATION_EXISTS` rather than overwrite an existing name. Both hold the whole database in memory.

## Boundaries

The browser package does not provide keyed, payload, scan, or fresh-build graph APIs; filtered vector search; object chunk, writer, reader, or manifest APIs; streaming export or import; deleting or listing persistent databases; native extensions; bound stores; app events; migration; or shared access between workers. General bundler compatibility and broad crash/quota recovery guarantees are not promised.

Catch `ZovaWasmError` and inspect its status rather than treating a storage error as permission to delete or recreate a database.
