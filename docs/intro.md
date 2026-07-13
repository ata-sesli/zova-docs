# Zova documentation

Zova is an embedded database for applications that need more than rows but do not want a separate storage service. A single `.zova` file combines ordinary SQLite records with content-addressed objects, exact-search vectors, and directed graph relationships.

## The storage model

| Shape | Best for | Identity |
|---|---|---|
| Records | application metadata, constraints, indexes, joins | your SQL primary keys |
| Objects | files, payloads, and immutable byte sequences | SHA-256 of the complete bytes |
| Vectors | embeddings and compact numeric features | collection name + application vector ID |
| Graphs | explicit relationships between stable entities | graph name + application node ID |

The important boundary is deliberate: **metadata remains relational**. Objects, vectors, and graph topology complement SQL rather than replacing it.

## Why Zova

- **Embedded and local:** no daemon, network protocol, or account is required.
- **SQLite remains visible:** SQL, locking, transactions, and PRAGMAs keep their normal meaning.
- **Operational tooling is included:** backup, compact copy, diagnostics, salvage, and bounded inspection are first-class workflows.
- **Portable bindings:** Rust, Python, Go, C, and Zig use the same storage behavior.

:::warning[Pre-1.0 compatibility]
Zova 0.23.0 writes file format 7. Format-7 files require Zova 0.23.0 or newer. Back up important databases before upgrading between pre-1.0 releases.
:::

## Recommended path

1. [Install the binding or artifact](./get-started/installation.md) for your platform.
2. [Create a database](./get-started/first-database.md) and keep application metadata in SQL.
3. Read the storage guide for the specialized shape you need.
4. Review [operational safety](./operations/safety.md) before shipping.
