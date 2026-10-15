# Current limitations

Zova 1.3.0 is an embedded SQLite-based storage engine with deliberately bounded specialized features. Evaluate these boundaries against the application before adopting it.

## Retrieval and graph scale

Core vector search is an exact flat scan. Zova core does not provide HNSW, IVFFlat, another ANN index, embedding generation, automatic quantization, or a BM25 abstraction. Approximate search is available only through the experimental USearch HNSW reference extension.

Graph traversal is bounded local breadth-first search. Zova does not provide Cypher, GQL, Gremlin, SPARQL, distributed traversal, weighted path algorithms, or automatic graph extraction.

These designs favor deterministic local behavior. They are not intended to imitate a distributed vector or graph server at large scale.

## Application ownership

Zova does not infer entities, cascade specialized deletions into arbitrary user tables, or validate every SQL record referenced by a graph node. Applications own metadata, permissions, identifiers, migrations, and referential lifecycle.

There are no object or chunk virtual tables for direct public SQL access. Private `_zova_*` tables are not a supported API.

## Files and bound stores

Bound stores provide explicit local placement for at most one object, one vector, and one graph store. They do not provide multiple named stores, routing rules, remote storage, S3 compatibility, synchronization, replication, or automatic path repair.

Multi-file atomicity follows SQLite `ATTACH` and journal-mode rules. Backup and restore create self-contained destinations rather than a multi-file bundle preserving the source layout.

## Events and concurrency

App events are same-process, polling-only, in-memory, and non-persistent. They have no blocking receive, callbacks, cross-process delivery, replay, or automatic mutation logging.

Calls through one database handle are serialized. Use multiple handles for actual SQLite concurrency and account for SQLite locking. Zova does not hide background worker threads inside the library.

## Extensions and bindings

Dynamic extensions are trusted in-process native code, not a sandbox. Native and generated-C hosts load explicitly trusted bundles on Linux, macOS, and Windows, and the Rust, Python, Go, and JavaScript bindings select bundles at create/open. Those bindings do not wrap extension authoring, scalar callbacks, explicit extension-data upgrades, linked plugin descriptors, or extension-aware migration; use the C ABI or Zig for those. Extension authoring beyond the common C plugin ABI, and the reference extensions, remain experimental. A single graph edge payload larger than the 1 MiB data-service page budget cannot be read through the plugin data service.

Store-management APIs are native Zig and CLI-only. Diagnostics and salvage are CLI-first; bindings should not parse human output as a library contract.

The native JavaScript and TypeScript package does not claim Electron, Deno, browser use, musl Linux, or Windows arm64. The separate experimental `zova-wasm` browser package exposes SQL, KV, transactions, prepared statements, objects, exact vectors, and graphs, not full native parity. Swift bindings are not published. Python wheels cover the documented Linux/macOS x86_64/arm64 and Windows x86_64 CPython 3.13/3.14 matrix; free-threaded builds and source distributions are not published.

## Recovery and compatibility

Zova does not perform in-place repair or overwrite destinations for backup, compact, restore, conversion, salvage, or format migration. Opening never migrates. Formats 9, 10, and 11 migrate explicitly into a new format-12 destination; older formats and downgrades are unsupported.

If any boundary is a critical product requirement rather than a tolerable trade-off, keep SQLite alone or choose a specialized system that provides it today.
