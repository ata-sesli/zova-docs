# Release artifacts

Zova publishes several distribution shapes because language and deployment needs differ.

| Artifact | Use it when |
|---|---|
| CLI archive | operating or inspecting databases without a language binding |
| C ABI archive | embedding from Go, C, or another FFI language |
| Source package | building the native project with Zig |
| Rust crates | integrating through Cargo |
| Python wheel/sdist | integrating through Python packaging |
| Go module | using the Go wrapper with a matching C ABI |

Download native archives from the [v0.23.0 release](https://github.com/ata-sesli/zova/releases/tag/v0.23.0). Match the version, operating system, and architecture. Do not mix headers from one release with a library from another.

Release archives are the preferred source for users who do not want Zig locally. Build from source only when targeting an unsupported platform, developing Zova, or requiring native extension loading behavior not present in generated-C snapshots.

