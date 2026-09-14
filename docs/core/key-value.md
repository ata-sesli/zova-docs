# Key-value storage

Zova 1.0 adds transactional binary key-value storage for caches, checkpoints, compact application state, and other data that does not need a relational schema. Keys and values are byte strings, grouped into byte-string namespaces.

Use SQL records when you need joins, constraints, indexes, or ad hoc queries. Use KV when the application already knows the exact namespace and key.

## Basic operations

```rust
let namespace = b"settings";
db.kv_put(namespace, b"theme", b"sage")?;

let value = db.kv_get(namespace, b"theme")?;
assert_eq!(value.as_deref(), Some(b"sage".as_slice()));

assert!(db.kv_delete(namespace, b"theme")?);
```

The Rust, Python, Go, JavaScript, C, and Zig surfaces provide matching put, get, delete, existence, count, namespace, and batch operations. The experimental browser package exposes its supported subset through `db.kv`.

## Transactions and atomic batches

KV mutations participate in the database handle's current transaction. An ordinary batch is operation-atomic: Zova owns a transaction when needed or uses an internal savepoint inside a caller-owned transaction.

```rust
db.begin_immediate()?;
use zova::KvEntry;

db.kv_put_many(
    b"search-results",
    &[
        KvEntry::new(b"result-1", b"one"),
        KvEntry::new(b"result-2", b"two"),
    ],
)?;
db.notify("cache:search-results", "generation:42")?;
db.commit()?;
```

The batch and notification become visible together at commit. Rollback discards both.

## Namespaces

Namespace operations let applications count and delete one logical group without inventing string prefixes inside keys. Batch reads preserve request order and missing entries.

Treat both namespace and key as opaque bytes. Zova does not impose a text encoding, infer hierarchy, or provide Redis-compatible commands, networking, replication, or remote synchronization.

## In-memory databases

`create_memory` and its binding equivalents provide the same KV and transaction model without a file. Memory databases are private to their handle and disappear when it closes. They are useful for tests, disposable pipelines, and process-local caches that still benefit from SQL transactions and Zova's typed storage APIs.

## Storage format

KV storage first appeared in format 10. Zova 1.0 writes format 11. A released v0.26.1 format-9 database can be migrated explicitly through the registered 9 → 10 → 11 sequence; opening never performs that migration automatically. See [Compatibility](../operations/compatibility.md).
