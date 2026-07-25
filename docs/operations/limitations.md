# Current limitations

Zova 0.26.1 is an embedded SQLite-based storage engine with deliberately bounded specialized features. Evaluate these boundaries against the application before adopting it.

## Retrieval and graph scale

Vector search is an exact flat scan. Zova does not provide HNSW, IVFFlat, another ANN index, embedding generation, automatic quantization, or a BM25 abstraction.

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

Dynamic extensions are trusted in-process native code. High-level JavaScript, TypeScript, Rust, Python, and Go extension authoring, dynamic bundle loading, and safe scalar callback APIs are not included in v0.26.1. Generated-C package artifacts cannot portably load external bundles under Zig 0.16.

Store-management APIs are native Zig and CLI-only. Diagnostics and salvage are CLI-first; bindings should not parse human output as a library contract.

The JavaScript and TypeScript package does not claim Electron, Deno, browsers, musl Linux, Windows arm64, or WASM. Swift bindings are not currently published. Python wheels are limited to the documented Linux/macOS CPython 3.10 and 3.12 matrix.

## Recovery and compatibility

Zova does not perform in-place repair or overwrite destinations for backup, compact, restore, conversion, and salvage. File format is pre-1.0 and may change at minor releases. Format 9 was introduced in v0.25, and Zova does not migrate format-8 databases in place.

If any boundary is a critical product requirement rather than a tolerable trade-off, keep SQLite alone or choose a specialized system that provides it today.
