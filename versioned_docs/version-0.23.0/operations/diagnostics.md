# Diagnostics and salvage

Zova separates inspection from recovery. `check` and `doctor` inspect without mutating the source. Salvage writes readable, validated content into a new destination and leaves the damaged database untouched.

Start with the least invasive command that answers the question.

## Choose the diagnostic level

```sh
zova check app.zova
zova check --deep app.zova
zova doctor app.zova
zova doctor --json app.zova
```

`check` verifies structural expectations. Deep mode examines specialized object, vector, graph, bound-store, and extension consistency. `doctor` presents health findings with explicit next actions and is usually the best starting point when a database will not open normally.

Use JSON when automation needs a versioned machine-readable report:

```sh
zova doctor --json app.zova
```

CLI JSON includes `cli_json_version = 1`. Do not parse human output as a binding API contract.

## Diagnostics are privacy-aware

Health reports avoid printing:

- object or chunk bytes;
- vector values;
- arbitrary application-row values;
- extension-indexed text; and
- private schema SQL.

Identifiers can still carry application meaning. Choose export-safe graph node and vector IDs when diagnostic reports may leave the device.

## Diagnose bound-store failures

Open and deep checks can identify missing paths, wrong store types, substituted identities, bound-set mismatches, and epoch inconsistencies. These conditions fail visibly instead of routing reads into an unrelated file.

Do not “repair” the problem by editing metadata. Restore the correct file set or use the corresponding `bind` command to record an intentionally moved store after validating its identity.

## Diagnose extension failures

A database may require extension code that is absent from the current process. Supply trusted dynamic bundles to the diagnostic command:

```sh
zova --extension ./my_ext.zovaext doctor app.zova
zova --extension ./my_ext.zovaext check --deep app.zova
```

Unknown `_zova_ext_*` storage and corrupt extension-private data appear as extension issues. Core Zova does not guess the meaning of those tables.

## Preview salvage

Before writing a recovery destination, inspect what appears recoverable:

```sh
zova salvage --dry-run damaged.zova
```

Dry-run does not prove that every recovered application relationship will be semantically complete. It reports what Zova can validate and copy within its storage contracts.

If a known-good backup exists, restore that first. Salvage is intended for cases where no acceptable backup is available.

## Write a salvage destination

```sh
zova salvage damaged.zova recovered.zova
```

The destination must not exist. Salvage never mutates the source and never overwrites another file.

Graph-aware salvage copies valid topology and skips invalid nodes or edges. Extension-aware salvage delegates private storage to a trusted extension hook. The hook may copy a valid subset, rebuild derived data, or skip it. If extension code or a salvage hook is unavailable, Zova skips that private storage and reports the omission.

This is safer than copying unknown extension tables and declaring them healthy.

## Validate recovered data

Treat `recovered.zova` as a candidate, not an automatic replacement:

1. Run `zova check --deep recovered.zova`.
2. Review salvage counts and skipped categories.
3. Open it with the production application and required extensions.
4. Compare critical application invariants.
5. Keep the original damaged file for forensic or future recovery work.
6. Replace the active path only through an explicit deployment step.

Zova cannot reconstruct arbitrary application semantics. If an object reference row is missing or a graph node points to an application record Zova does not own, application-level reconciliation is still required.
