# Migrate from SQLite

Use conversion when an existing SQLite application wants to add Zova’s object, vector, graph, diagnostics, backup, compact-copy, and salvage capabilities without mutating its source database.

## Convert to a new file

```rust
zova::Database::convert_sqlite_to_zova("app.sqlite", "app.zova")?;
```

Equivalent functions exist in Zig, Python, and Go. The destination must be a new path; Zova will not overwrite it.

## Before conversion

1. Back up the source SQLite database.
2. Run SQLite integrity checks and resolve existing corruption.
3. Check for names reserved by Zova. Conflicts fail explicitly rather than being renamed.
4. Record application PRAGMAs such as foreign keys, journal mode, and synchronous mode.

## After conversion

Open the new file through the target Zova binding, validate representative queries, and exercise backup/restore. Conversion copies relational content; it does not redesign application tables or automatically move bytes into object storage.

:::warning[Cut over explicitly]
Keep the source database until the new application path has passed correctness and recovery testing.
:::
