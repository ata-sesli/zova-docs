# Zova v0.23.0

Zova 0.23.0 expands the optional-store model to graphs, strengthens extension compatibility checks, and advances the on-disk format.

## Bound graph stores

Applications can place graph topology in one optional external `.zova` store beside the main records database. Graph reads and writes route transparently after open, while the CLI provides create, bind, split, inspect, and unbind workflows. Identity markers, bound-set IDs, and epochs make missing or mismatched files diagnosable.

## Compatibility

The file format advances from 6 to 7. Format-7 files require Zova 0.23.0 or newer; older builds reject them. This is an intentional pre-1.0 boundary.

## Extensions

Manifest validation now semantically enforces `zova_abi_min`, rejecting malformed versions and requirements newer than the running host before native code can load. The release retains trusted local bundles, the experimental bundle producer, app-defined C ABI scalar functions, and extension-aware diagnostics and salvage.

## Storage and query APIs

The release includes graph batch APIs and preserves raw `f16`/`i8` vector storage, SQL-native vector search, SQL-native graph traversal, app events, and bound object/vector stores.

See the [GitHub release](https://github.com/ata-sesli/zova/releases/tag/v0.23.0) for downloads and the complete release record.

