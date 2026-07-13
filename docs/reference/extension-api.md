# Extension reference

Extensions combine a manifest, a trusted native library, lifecycle hooks, and private tables under a reserved prefix.

## Trust and lifecycle

```sh
zova extension trust ./my_ext.zovaext
zova --extension ./my_ext.zovaext extension install app.zova my_ext
zova --extension ./my_ext.zovaext extension check app.zova my_ext
zova --extension ./my_ext.zovaext extension drop app.zova my_ext
zova extension untrust my_ext
```

Trust is local to the process environment, not embedded in the database. Manifest or library hash changes invalidate trust.

## Manifest contract

A manifest declares the extension name, version, native library, and minimum Zova ABI. Names and lengths are validated. `zova_abi_min` must be valid `major.minor.patch`; the running host must satisfy it before code loads.

## Storage and hooks

An extension owns only tables prefixed `_zova_ext_<name>_`. Install, check, drop, and optional salvage hooks run inside Zova-managed operations. Core salvage never interprets extension-private tables without a hook.

## Authoring workflow

```sh
zova extension scaffold ./sample_ext --name sample_ext --version 0.1.0
zova extension build ./sample_ext
zova extension pack ./sample_ext --out ./sample_ext.zovaext
zova extension verify --smoke ./sample_ext.zovaext
```

Treat bundles as in-process native code: review, build, sign/distribute, and trust them with the same care as application binaries.

