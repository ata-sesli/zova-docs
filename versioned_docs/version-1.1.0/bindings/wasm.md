# Browser WebAssembly

`zova-wasm` is the experimental browser package for Zova SQL and binary KV. It runs the real Zova core and bundled SQLite inside a dedicated worker as one WebAssembly module.

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

One owner may open a name at a time. A competing tab or worker receives `ZOVA_BUSY`; wait for the owner to close before retrying with a bounded delay. Different names can be open concurrently.

OPFS data belongs to the browser origin and profile. Site-data clearing, browser eviction, storage limits, or an origin change can remove or isolate it. `openPersistent()` does not grant persistent-storage permission, and the package has no export or backup API in v1.1.0.

## Boundaries

The v1.1.0 browser surface provides SQL, prepared query values, and binary KV. It does not provide native-package parity for objects, vectors, graphs, extensions, app events, backup/export, or automatic format migration. General bundler compatibility, shared multi-tab connections, and broad crash/quota recovery guarantees are not promised.

Catch `ZovaWasmError` and inspect its status rather than treating a storage error as permission to delete or recreate a database.
