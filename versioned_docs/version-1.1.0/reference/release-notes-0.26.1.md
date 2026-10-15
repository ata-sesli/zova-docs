# Zova v0.26.1

Zova 0.26.1 polishes the JavaScript and TypeScript release introduced in v0.26.0 and corrects package and repository metadata for reliable installation and publication.

## Package corrections

- The JavaScript and TypeScript package is published as `zova-js`.
- Platform-native companion packages use stable names for macOS, Linux, and Windows.
- Package metadata, release artifacts, documentation, and the Go module now use the GitHub owner `ata-sesli`.
- JavaScript release packaging, TypeScript artifact builds, native-package lookup, and npm trusted-publishing configuration are corrected.
- Windows JavaScript tests and Rust lifecycle tests are stabilized for slower CI environments.

## Compatibility

- Package and C ABI versions advance to 0.26.1.
- The on-disk format remains format 9; no database migration is required from Zova 0.25.0 or 0.26.0.
- The Go module path is `github.com/ata-sesli/zova/bindings/go`.

Applications upgrading from format 8 must still export with a compatible 0.24 build and import into a newly created format-9 database. Read the [v0.25.0 release notes](./release-notes-0.25.md) for that compatibility boundary.

See the [full v0.26.0 to v0.26.1 changelog](https://github.com/ata-sesli/zova/compare/v0.26.0...v0.26.1).
