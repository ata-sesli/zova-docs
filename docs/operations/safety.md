# Operational safety

Zova’s file operations write new destinations and refuse to overwrite existing paths.

```sh
zova backup app.zova app.backup.zova
zova compact app.zova app.compact.zova
zova restore app.backup.zova app.restored.zova
```

## What each operation does

- **Backup** uses SQLite’s online backup API to create a consistent copy.
- **Compact** uses `VACUUM INTO` to create a space-reclaiming copy.
- **Restore** copies a backup into a fresh destination.

When optional stores are bound, these operations copy readable specialized data into a self-contained destination. They do not reproduce the external-store layout.

## Production checklist

1. Keep backups on a different failure domain.
2. Periodically open and validate restored copies.
3. Run `check --deep` before and after risky migrations.
4. Use explicit transactions for multi-step application writes.
5. Understand SQLite journal-mode requirements before relying on multi-file crash atomicity.

Savepoints provide connection-local partial rollback but are not independent transactions.

