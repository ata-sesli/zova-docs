# Zova v0.26.0

Zova 0.26.0 adds official JavaScript and TypeScript bindings, distributed on npm as `zova-js` with prebuilt Node-API packages for supported platforms.

## JavaScript and TypeScript

The synchronous `Database` API covers database lifecycle, SQL statements, transactions, objects, typed vectors, public graph operations, and bundled extension lifecycle.

A separate `AsyncDatabase` queues native work on the Node worker pool while preserving FIFO order per database and explicit close behavior. The package also includes TypeScript declarations and runnable SQL, object, vector, and graph examples.

## Runtime packages

Prebuilt packages target:

- macOS arm64 and x86_64;
- glibc Linux arm64 and x86_64; and
- Windows x86_64 with MSVC.

Node.js 22 and 24 and Bun are supported. Electron, Deno, browsers, musl Linux, Windows arm64, and WASM are not claimed.

The release adds clean-package installation smoke tests, Node ESM, Node CommonJS, and Bun runtime coverage, release-artifact assembly, and protected npm publication.

## Compatibility

- Package and C ABI versions advance to 0.26.0.
- The on-disk format remains format 9; no database migration is required from Zova 0.25.0.
- Advanced opaque-key graph scans, edge payloads, and fresh-build sessions remain C ABI and raw `zova-sys` capabilities.

See the [full v0.25.0 to v0.26.0 changelog](https://github.com/ata-sesli/zova/compare/v0.25.0...v0.26.0).
