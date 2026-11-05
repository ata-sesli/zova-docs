# Zova v1.0.0

Zova 1.0.0 establishes stable native 1.x API and storage-compatibility contracts for embedded SQL, binary KV, objects, exact vectors, graphs, and transaction-aware application notifications.

## Major additions since v0.26.1

- First-class in-memory databases across native bindings.
- Transactional binary key-value storage with atomic batches, namespace operations, and high-level binding coverage.
- Explicit same-process app events with commit, rollback, savepoint, bounded-queue, and overflow semantics.
- Non-mutating format probing and explicit copy-forward migration through the CLI, C ABI, Rust, Python, Go, and JavaScript.
- A fixed 1 MiB streaming object profile, expanded streaming/range APIs, and format-11 object schemas.
- Experimental `zova-wasm` browser SQL and KV in memory or named OPFS storage.
- Target-specific generated-C Rust companion crates, so supported Rust consumers need a C compiler but not Zig or build-time downloads.
- Windows x64 Python wheels alongside Linux and macOS. CPython 3.13 stable-ABI wheels support Python 3.13 and 3.14; no source distribution is published.

## Stable 1.x contract

Package and C ABI identity are `1.0.0`. Documented native APIs preserve ownership, error categories, transaction semantics, deterministic ordering, and documented thread-safety guarantees throughout 1.x.

Opaque-key graph topology, payload, scan, and fresh-build sessions remain supported low-level C ABI and raw `zova-sys` capabilities. High-level bindings intentionally do not wrap them. Extension authoring and the separate browser API remain experimental.

## Storage compatibility

The current storage format is 11. Format-11 release-candidate databases need no migration. Released v0.26.1 format-9 databases and retained format-10 databases migrate explicitly into a new format-11 destination. Opening never silently migrates, the source remains unchanged, and downgrades are unsupported.

## Distribution

Native packages use `1.0.0` across Cargo, PyPI, npm, and Go. npm publishes `zova-js`, its native companions, and `zova-wasm` under `latest`. The Go module tag is `bindings/go/v1.0.0`.

Vector search remains exact. Notifications are same-process events rather than a durable queue. WASM exposes experimental SQL/KV rather than full native parity, and OPFS remains subject to browser storage policy.

See the [full v0.26.1 to v1.0.0 changelog](https://github.com/ata-sesli/zova/compare/v0.26.1...v1.0.0).
