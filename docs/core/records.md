# Records

Records are ordinary SQLite. They are the right home for application-owned metadata, constraints, indexes, joins, views, and triggers.

## What Zova exposes

Every supported binding provides database creation/opening, SQL execution, prepared statements, typed parameter binding, row stepping, typed column access, transactions, savepoints, row IDs, and change counts. SQL written for SQLite remains SQLite SQL.

```sql
create table documents(
  id integer primary key,
  title text not null,
  object_id blob,
  vector_id text unique,
  graph_node_id text unique,
  created_at text not null
);
```

The references are application policy. Deleting an object or vector does not scan arbitrary user tables and rewrite those references.

## Transaction behavior

Use Zova’s transaction and savepoint helpers when one logical operation spans SQL rows plus objects, vectors, graphs, or app events. Specialized mutations participate in the same connection transaction, including when an optional store is bound.

## SQLite remains in control

Zova does not silently enable foreign keys, change journal or synchronous mode, enable auto-vacuum, or run `VACUUM`. Configure those choices for your workload. Multiple handles follow SQLite’s normal locking rules; calls through one handle are serialized.

