# Compatibility

Zova is pre-1.0. File format, native ABI, extension ABI, generated artifacts, and language packages must be treated as related but distinct compatibility boundaries.

## File format 9

| Zova release | File format | Opens format 9? |
|---|---:|---|
| 0.25.0 through 0.26.1 | 9 | yes |
| 0.24.x | 8 | no |
| 0.23.x and older | 7 or earlier | no |

The format 8 → 9 transition is intentional. Zova does not migrate format-8 databases in place. Older builds reject format-9 files instead of attempting a partial open, and renaming or editing metadata cannot make an older binary understand the newer private schema.

## Upgrade in a recoverable sequence

1. With the old release, create and verify a backup.
2. Read the target release notes for format and behavioral changes.
3. Upgrade application packages, headers, and native libraries together.
4. Open a disposable copy first.
5. Run `zova check --deep` with the new release.
6. Exercise application reads, writes, backup, and restore.
7. Keep the old application and pre-upgrade data until cutover is proven.

To move existing format-8 data forward, export it with a compatible 0.24 build, then import it into a newly created format-9 database. Rollback uses the retained format-8 database or export with the older application; it does not mean opening a format-9 file with Zova 0.24.

Zova 0.26.0 and 0.26.1 retain format 9, so upgrading from 0.25 or 0.26.0 does not require another database migration. Keep packages, headers, native libraries, and extensions aligned even when the file format is unchanged.

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
- Read [release notes](../reference/release-notes-0.26.1.md) before changing versions.
