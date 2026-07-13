# Current limitations

Zova is intentionally explicit about what v0.23.0 does not provide.

## Performance boundaries

- Vector search is exact flat scan, not ANN indexing.
- Graph traversal is bounded local BFS, not a distributed graph engine.
- One database handle serializes its calls; use multiple handles for SQLite concurrency.

## Operational boundaries

- Bound stores are explicit local file placement, not cloud storage or synchronization.
- Multi-file atomicity follows SQLite `ATTACH` and journal-mode rules.
- App events are same-process, polling-only, and non-persistent.
- Zova does not automatically repair moved store paths.

## Extension boundaries

External bundles are trusted native code. Safe high-level Rust, Python, and Go scalar callback registration is not included. Generated-C package snapshots cannot portably load external bundles under Zig 0.16.

## Data-model boundaries

Zova does not infer entities, validate arbitrary application row IDs used as graph nodes, or cascade deletions through user tables. Applications retain ownership of metadata and lifecycle policy.

