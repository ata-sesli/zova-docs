# Zova v0.23.0

Zova 0.23.0 expands optional storage placement to graphs, strengthens extension compatibility checks, and advances the on-disk format from 6 to 7.

:::warning[Compatibility boundary]
Format-7 databases require Zova 0.23.0 or newer. Zova 0.22.x and earlier reject them. Make and verify a backup before upgrading important files.
:::

## Optional bound graph stores

Graph topology can now live in one external `.zova` store beside the main records database, parallel to existing object and vector stores.

```sh
zova graph-store create graphs.zova
zova graph-store bind main.zova graphs.zova
zova graph-store info main.zova
```

Existing graph reads and writes route transparently after open. To move graphs already stored in the main file:

```sh
zova backup main.zova before-split.zova
zova split --graphs main.zova graphs.zova
```

The destination must be new. Store identity, bound-set markers, and graph epochs make missing, substituted, or inconsistent files diagnosable during open, `doctor`, and `check --deep`.

Backup, compact, and restore inline readable bound graph data into a self-contained destination, matching the behavior of object and vector stores.

## File format 7

The optional graph-store metadata and consistency model require file format 7. Upgrade application bindings, CLI artifacts, headers, and native libraries together.

Rollback means restoring the pre-upgrade format-6 backup with the older application. It does not mean opening a format-7 file with Zova 0.22.

## Extension ABI enforcement

Bundle manifests declare `zova_abi_min`. The host now parses the requirement as canonical `major.minor.patch` and rejects malformed values, a different ABI major, or a minimum newer than the running host before native code loads.

This closes a safety gap where an incompatible requirement could reach the in-process loader. Extension ABI remains pre-1.0, so authors should still rebuild and test for every Zova minor release.

The release retains trusted local `.zovaext` bundles, the experimental scaffold/build/pack workflow, app-defined C ABI scalar SQL functions, and extension-aware diagnostics and salvage.

## Storage and query surface

v0.23.0 also includes graph batch APIs and preserves:

- content-addressed objects and streaming writers;
- exact vectors with `f32`, raw `f16`, and raw `i8` storage;
- SQL-native vector distance and ranked search;
- graph neighbors and bounded SQL-native walks;
- same-process app events;
- optional bound object and vector stores; and
- backup, compact, restore, diagnostics, and salvage.

## Before upgrading

1. Create and restore-test a backup with the old release.
2. Upgrade all application and native artifacts to 0.23.0 together.
3. Open a disposable copy and run `zova check --deep`.
4. Rebuild and smoke-test native extensions.
5. Keep the old application and backup until production behavior is verified.

Downloads and artifact checksums are available from the [GitHub v0.23.0 release](https://github.com/ata-sesli/zova/releases/tag/v0.23.0).
