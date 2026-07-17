# Compatibility

Zova is pre-1.0. File format, native ABI, extension ABI, generated artifacts, and language packages must be treated as related but distinct compatibility boundaries.

## File format 8

| Zova release | File format | Opens format 8? |
|---|---:|---|
| 0.24.0 and newer compatible releases | 8 | yes |
| 0.23.x and older | 7 or earlier | no |

The format 7 → 8 transition is intentional. Zova 0.24.0 does not migrate format-7 databases in place. Older builds reject format-8 files instead of attempting a partial open, and renaming or editing metadata cannot make an older binary understand the newer private schema.

## Upgrade in a recoverable sequence

1. With the old release, create and verify a backup.
2. Read the target release notes for format and behavioral changes.
3. Upgrade application packages, headers, and native libraries together.
4. Open a disposable copy first.
5. Run `zova check --deep` with the new release.
6. Exercise application reads, writes, backup, and restore.
7. Keep the old application and pre-upgrade data until cutover is proven.

To move existing data forward, use a 0.23.x build to export it, then import it into a newly created format-8 database. Rollback uses the retained format-7 database or export with the 0.23.x application; it does not mean opening a format-8 file with Zova 0.23.

## Keep native artifacts aligned

The C header, static library, CLI, generated-C snapshot, and binding package should come from the same Zova release. A successful link does not prove that mixed versions agree on every struct or capability.

Go depends on a matching C ABI archive. Rust and Python packages build or ship their documented native implementation. External extension loading also differs between native Zig-built artifacts and generated-C package snapshots.

## Extension requirements are independent

Extension manifests declare `zova_abi_min` as `major.minor.patch`. The host rejects malformed requirements and a minimum newer than itself before loading native code.

That comparison is a safety floor, not a full pre-1.0 binary compatibility promise. Rebuild and test native extensions for each Zova minor release. Also match the operating system, architecture, Zig/native ABI expectations, and deployment target.

## Plan for pre-1.0 change

- Pin Zova versions in applications that own important data.
- Record the creating version with backups.
- Keep export or rollback paths across upgrades.
- Test restored data, not only in-place development databases.
- Read [release notes](../reference/release-notes-0.24.md) before changing minor versions.
