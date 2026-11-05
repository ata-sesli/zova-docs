# Release artifacts

Zova publishes several distribution shapes because language bindings and deployment environments need different native boundaries. Choose one coherent path and keep all pieces on the same release.

## Choose an artifact

| Artifact | Use it when | Local build tools |
|---|---|---|
| npm `zova-js` package | using JavaScript or TypeScript on a supported platform | none for a prebuilt install |
| npm `zova-wasm` package | experimental browser SQL and KV | none; serve the packaged worker and WASM assets |
| CLI archive | operating or inspecting databases directly | none |
| C ABI archive | embedding from C, Go, or another FFI language | linker/toolchain for the host app |
| Source archive | building Zova or targeting an unpublished platform | Zig 0.17.0+ and C compiler |
| Rust `zova` crate | using the safe Rust API | Rust 1.79+ and C compiler |
| Rust `zova-sys` crate | using raw FFI or low-level C ABI features | Rust 1.79+ and C compiler |
| Python wheel | using a supported CPython/platform combination | none beyond Python |
| Go module + C ABI | using the cgo wrapper | Go 1.22+, cgo, matching native archive |

Download native archives from the [v1.3.0 GitHub release](https://github.com/ata-sesli/zova/releases/tag/v1.3.0). Match version, operating system, architecture, and artifact type.

## Verify the package boundary

Release archives should be obtained from the official release and verified using the published checksums where provided. Preserve provenance in build automation instead of downloading “latest” during every production build.

Do not combine a header from one version with a static library from another. Do not point the Go binding at an arbitrary locally built `libzova_c` without recording the exact revision and options.

## Native versus generated-C behavior

Rust packaging selects target-specific generated-C companion crates so users do not need Zig or build-time downloads. Python publishes stable-ABI wheels with the native extension included and no source distribution. Generated-C snapshots preserve the documented public behavior and C symbols. Since 1.2.0 they also include the trusted `.zovaext` loader on Linux, macOS, and Windows, so package consumers can select bundles at create/open. Packages from 1.1.0 and earlier do not gain this retroactively.

C ABI archives bundle the compiler-runtime helpers they need, so the system C toolchain can link them. A loaded extension bundle must still match the host's OS, CPU, deployment target, and runtime ABI.

## Build from source only when needed

```sh
zig build
zig build c-abi
```

Source builds are appropriate for Zova development, unsupported targets, controlled native integration, or extension-host requirements. Published archives are simpler for users who only need a supported CLI or ABI.

After packaging, smoke-test the exact artifact that will ship: create a database, execute a write and read, run deep diagnostics, and verify the version. Testing a different local build does not validate the release archive.
