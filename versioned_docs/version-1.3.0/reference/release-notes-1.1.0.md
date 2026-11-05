# Zova v1.1.0

Zova 1.1.0 expands the bundled SQLite surface, lowers native graph batch-read and loading overhead, and makes trusted dynamic extensions work on Windows. The stable 1.x API and format-11 storage contract are unchanged.

## Changes since v1.0.0

- Bundled SQLite now enables `carray`, built-in math functions, and the R-Tree and Geopoly spatial modules across native builds and language distributions. See [Bundled SQLite modules](../core/sql.md#bundled-sqlite-modules).
- Keyed graph reads, degree batches, and edge-payload reads use direct `carray` access instead of temporary staging tables. Results keep their alignment, duplicates, missing keys, bound-store routing, and transaction snapshots.
- Prepared graph loading reuses key parameters and borrows synchronous text inputs safely. A retained benchmark measured about 9% faster fresh node loading and about 2% faster complete fresh graph construction.
- Native Zig-built hosts load trusted `.zovaext` bundles on Windows, with dependency search restricted to the bundle directory.
- Trust records add a bundle-wide content hash, so a change to any bundle file, including a sibling dependency, requires a new trust decision.
- Extension bundle digests stream file contents instead of reading whole files into memory.
- Opt-in SQLite query diagnostics for source builds, plus CI coverage for query plans, capabilities, generated C, and packaged runtimes.

## Compatibility

Package and C ABI identity are `1.1.0`. Storage format remains 11; existing format-11 databases need no migration. Formats 9 and 10 keep their explicit copy-forward migration path. Existing 1.x ownership, ordering, error, and transaction guarantees remain in force.

## Distribution

Native packages use `1.1.0` across Cargo, PyPI, npm, and Go. npm publishes `zova-js`, its native companions, and the experimental `zova-wasm` package. The Go module tag is `bindings/go/v1.1.0`.

Vector search remains exact. Notifications remain same-process events. Extension authoring and the browser WASM API remain experimental. Generated-C package builds still cannot load external bundles.

See the [full v1.0.0 to v1.1.0 changelog](https://github.com/ata-sesli/zova/compare/v1.0.0...v1.1.0).
