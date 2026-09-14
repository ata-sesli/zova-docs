# API stability

Zova 1.0.0 establishes the stable native 1.x contract. Documented native APIs preserve public names, argument meanings, status and error categories, ownership rules, transaction behavior, deterministic ordering, and documented thread-safety guarantees throughout 1.x.

Additive APIs may appear in 1.x. Removing a documented API or changing accepted data, ownership, ordering, or successful behavior requires a new major version unless the old behavior is a correctness or safety defect.

## Stable native surfaces

The contract covers documented lifecycle and SQL operations, transactions and savepoints, explicit format probing and migration, binary KV, objects, exact vectors, public graph operations, bundled extension lifecycle, same-process app events, diagnostics, and version reporting wherever a binding exposes them.

Binding coverage intentionally differs:

| Capability | Zig | C | Rust | Python | Go | JavaScript/TypeScript |
|---|---|---|---|---|---|---|
| SQL, lifecycle, transactions, backup | Yes | Yes | Yes | Yes | Yes | Yes |
| In-memory databases | Yes | Yes | Yes | Yes | Yes | Yes |
| Format probe and migration | Yes | Yes | Yes | Yes | Yes | Yes |
| KV and notifications | Yes | Yes | Yes | Yes | Yes | Yes |
| Objects, exact vectors, public graph API | Yes | Yes | Yes | Yes | Yes | Yes |
| Opaque graph keys, payloads, scans, fresh builds | Yes | Yes | raw `zova-sys` | No | No | No |
| Store create, bind, and split management | Zig/CLI | selected operations | No | No | No | No |

The supported low-level graph publication APIs are deliberately not high-level wrappers.

## Ownership, errors, and concurrency

C inputs are borrowed for the call unless documented otherwise. Owned outputs must be released with their matching free function. Handles become invalid after successful terminal cleanup.

C status numbers keep their meanings throughout 1.x. Bindings preserve the underlying category in language-native errors. Batch operations are atomic even inside caller-owned transactions, where Zova uses an internal savepoint.

One C database handle is safe to call from multiple threads, but calls are serialized. Child handles share that boundary. Bindings can be stricter: Rust uses explicit `SharedDatabase` for serialized sharing, and JavaScript `AsyncDatabase` queues work FIFO.

## Outside the stable contract

The separate `zova-wasm` browser API and extension authoring remain experimental. Private `_zova_*` schema, internal cache sizes, query plans, generated private keys other than documented opaque keys, human-readable CLI output, and the exported Zig `Database` field layout are implementation details.

Storage compatibility is a separate promise from API compatibility. Read [Compatibility](./compatibility.md) before opening data with a new release.
