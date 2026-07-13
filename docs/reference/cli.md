# CLI reference

The CLI is designed for bounded inspection, diagnostics, migration, and recovery. Run `zova --help` or `zova <command> --help` for the complete argument contract.

## Inspect

```sh
zova info app.zova
zova stats --json app.zova
zova tables app.zova
zova objects app.zova
zova vectors app.zova
zova graphs app.zova
zova graph-neighbors --limit 20 app.zova app message:123
zova graph-walk --max-depth 2 --limit 50 app.zova app message:123
```

## Operate

```sh
zova backup app.zova backup.zova
zova compact app.zova compact.zova
zova check --deep app.zova
zova doctor --json app.zova
zova salvage --dry-run app.zova
```

## Manage stores and extensions

Object, vector, and graph stores each expose create, bind, info, and unbind commands; existing data moves with `zova split`. Extension commands cover trust, install, list, info, check, drop, scaffold, build, pack, and verify.

JSON responses include `cli_json_version = 1`. Human and JSON output avoid dumping object/chunk bytes, vector values, private schemas, and arbitrary user records.

