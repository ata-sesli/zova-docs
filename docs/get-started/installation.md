# Installation

Choose the highest-level binding that fits your application. All bindings use the same Zova storage engine; the difference is packaging and language ergonomics.

## Rust

```sh
cargo add zova@0.23.0
```

Or pin it in `Cargo.toml`:

```toml
[dependencies]
zova = "0.23.0"
```

The safe `zova` crate builds the native layer from bundled generated C. You need Rust 1.79 or newer and a C compiler, but not Zig. Use `zova-sys` only when you need raw FFI.

## Python

```sh
uv add zova==0.23.0
# or
python -m pip install zova==0.23.0
```

Published wheels target Linux and macOS, x86_64 and arm64, on CPython 3.10 and 3.12. Wheel installation needs no compiler. If your platform falls back to the source distribution, it needs Rust and a C compiler.

## Go

```sh
go get github.com/atasesli/zova/bindings/go@v0.23.0
```

Go calls the C ABI through cgo. Download the matching C ABI release archive and point `CGO_CFLAGS` and `CGO_LDFLAGS` at its `include` and `lib` directories.

## CLI, C, and Zig

Download the CLI or C ABI archive from the [v0.23.0 GitHub release](https://github.com/ata-sesli/zova/releases/tag/v0.23.0). Source builds require Zig 0.16.0 or newer:

```sh
zig build          # CLI
zig build c-abi    # zova.h + static C ABI library
```

## Toolchain summary

| Path | Required locally |
|---|---|
| Rust crate | Rust 1.79+, C compiler |
| Python wheel | Python 3.10+ |
| Python source distribution | Python, Rust, C compiler |
| Go | Go 1.22+, cgo, matching C ABI |
| Native Zig | Zig 0.16.0+, C compiler |

Zova vendors SQLite 3.53.2; a system SQLite installation is not required.

