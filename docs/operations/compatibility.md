# Compatibility

Zova is pre-1.0, and storage compatibility boundaries may occur between minor releases.

## Current format

| Zova release | File format | Opens format 7? |
|---|---:|---|
| 0.23.0+ | 7 | yes |
| 0.22.x and older | 6 or earlier | no |

The format 6 → 7 transition is intentional. Older builds reject format-7 files rather than attempting a partial open.

## Upgrade discipline

1. Create and verify a backup with the old release.
2. Read the new release notes for format and ABI changes.
3. Upgrade application packages and native artifacts together.
4. Open a disposable copy first and run deep diagnostics.
5. Keep rollback artifacts until production behavior is verified.

Extension manifests independently declare `zova_abi_min`. The host rejects malformed or too-new requirements, but extension authors should still rebuild and test for every pre-1.0 minor release.

