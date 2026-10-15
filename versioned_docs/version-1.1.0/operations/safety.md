# Operational safety

Zova's file operations favor new destinations over in-place mutation. Backup, compact, restore, conversion, and salvage refuse to overwrite an existing path, making the source and rollback artifact explicit.

Operational safety still depends on application choices: where copies live, how often they are verified, which journal mode is used, and whether the entire required file set is included.

## Backup, compact, and restore solve different problems

```sh
zova backup app.zova app.backup.zova
zova compact app.zova app.compact.zova
zova restore app.backup.zova app.restored.zova
```

| Operation | Mechanism | Use it for |
|---|---|---|
| `backup` | SQLite online backup API | a consistent operational snapshot |
| `compact` | SQLite `VACUUM INTO` | a verified copy that reclaims unused pages |
| `restore` | copy backup into a new destination | recovery without overwriting either artifact |

Backup does not promise the smallest possible file. Compact is not a substitute for backup history. Restore does not overwrite a damaged database in place; it produces a separate candidate that can be checked before cutover.

## Verify a recovery path, not just a file

A backup is useful only if your application can recover from it. Regularly test:

```sh
zova restore app.backup.zova restore-test.zova
zova check --deep restore-test.zova
zova info restore-test.zova
```

Then open `restore-test.zova` with the same application version and exercise representative reads. If extensions are required, make their code available during verification. If a release changes file format, keep a binary that can still open the backup.

Store important backups on a different failure domain. A second file on the same failing disk is not sufficient protection.

## Bound-store copies become self-contained

When a main database has optional bound object, vector, or graph stores, backup, compact, and restore copy readable specialized data into the destination file. The result is one self-contained `.zova` database without bound-store rows.

This behavior makes recovery portable, but it may require enough free space for all attached data. The output does not preserve the original multi-file placement. Split it again only after the restored single-file database has been validated.

## Transactions protect logical operations

Use explicit transactions when related changes must be accepted together. Savepoints offer partial rollback inside a transaction, but they are not independent commits.

With bound stores, SQLite `ATTACH` and journal-mode rules determine crash atomicity across files. Zova does not silently change journal mode or claim stronger guarantees. Test the actual deployment configuration if a cross-file transaction is critical.

## Prepare risky changes

Before a format upgrade, split, migration, extension change, or large deletion:

1. Make a new backup.
2. Restore and deep-check it.
3. Record the Zova version and required extension artifacts.
4. Estimate destination disk space.
5. Define which paths the application will use after success.
6. Define the rollback condition before starting.
7. Run `zova check --deep` after the change.

Do not use salvage as a routine migration tool. It is a best-effort recovery path for readable validated data; a known-good backup is preferable.

## Production checklist

- Keep versioned backups outside the primary failure domain.
- Test restoration on a schedule.
- Run deep diagnostics before and after risky local migrations.
- Never edit `_zova_*` tables or bound-store markers directly.
- Keep application metadata and specialized references consistent through explicit workflows.
- Document required bound files and extensions with the application release.
- Monitor free space before backup, compact, restore, split, and salvage.
- Keep storage-format compatibility and copy-forward migration boundaries in the rollback plan.

Continue with [Diagnostics and salvage](./diagnostics.md) for inspection and degraded-data recovery.
