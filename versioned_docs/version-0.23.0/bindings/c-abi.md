# C ABI

The C ABI is Zova's language-neutral integration boundary. Use it from C, Go, or another language that can call a static native library. Include the `zova.h` and link the matching `libzova_c.a` from the same release archive.

## Handle-based design

Database, statement, object writer, listener, and result values use opaque handles. Callers do not depend on Zig struct layouts or reach into SQLite internals.

Functions return `zova_status`. On failure, retrieve the documented error information before performing another operation that may replace handle-local diagnostics. Never infer success from a non-null output when the status reports an error.

Request structs use explicit fields and lengths rather than C string assumptions where binary or borrowed data is involved. Fixed-width types keep IDs and numeric layout predictable across callers.

## Ownership is part of the API

The header documents whether input is borrowed, output is caller-provided, or a returned allocation is owned by Zova. Lists, buffers, object manifests, vectors, graph results, and diagnostic outputs must be released with their matching `zova_*_free` function.

Do not use the C runtime's `free` on Zova-owned memory and do not retain borrowed callback arguments after the callback returns. Pair every successful handle creation with its documented close or free operation, including failure paths after later setup steps.

## Concurrency

Calls through one database handle are internally serialized. This protects the handle; it does not create parallel SQLite execution. Use multiple database handles when the host needs concurrent database work and account for SQLite locking between them.

Avoid holding application locks across Zova calls unless lock ordering is defined, especially when callbacks can re-enter application code.

## Scalar SQL callbacks

The v0.23 C ABI can register scalar SQL functions on Zova-owned connections. Callback arguments are borrowed only for the call, and Zova copies result bytes according to the result contract.

A callback must not re-enter the same `zova_database` handle. Re-entry can violate serialization and SQLite callback assumptions. If a callback needs external state, provide it through the documented user-data lifetime rather than global mutable state.

## Extensions and artifact choice

Native Zig-built C ABI artifacts can verify, trust, supply, and load external `.zovaext` bundles. Generated-C snapshots retain source-compatible symbols but report dynamic loading as unavailable under Zig 0.16.

Choose the native archive when external bundles are required. Bundled extension lifecycle and ordinary storage APIs remain available where the artifact documents them.

The release header is the authoritative symbol and struct contract. Do not copy declarations from examples into a separate local header.
