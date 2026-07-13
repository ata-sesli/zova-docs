# Extensions

Extensions add trusted native behavior and private Zova-owned metadata without making database files executable.

## Trust model

A `.zova` file can record that an extension is required, but it never contains or automatically loads executable code. The application or CLI process explicitly supplies and trusts extension bundles. Zova hashes the manifest and native library; changes require a new trust decision.

Each extension owns tables under its `_zova_ext_<name>_` prefix. Install, check, drop, and salvage hooks run through Zova-managed boundaries.

## ABI compatibility

Bundle manifests declare `zova_abi_min`. Zova parses the semantic version and rejects malformed requirements or a minimum newer than the running host before loading native code. Until the extension ABI stabilizes, authors should rebuild and test for each Zova minor release.

## Runtime boundary

Native Zig, CLI, and Zig-built C ABI artifacts can load trusted bundles. Generated-C snapshots used by package builds retain source-compatible symbols but cannot portably load external bundles under Zig 0.16. Bundled extensions remain available where documented.

See the [extension reference](../reference/extension-api.md) for commands and authoring limits.

