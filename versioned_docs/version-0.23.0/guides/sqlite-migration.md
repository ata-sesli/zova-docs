import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Migrate from SQLite

Zova can copy an existing SQLite database into a new `.zova` file without mutating the source. Use this path when an application wants to retain its relational schema while adding objects, vectors, graphs, diagnostics, and Zova's operational tooling.

Conversion is a file-format transition, not an automatic data-model redesign.

## What conversion preserves

Zova copies application-owned tables, rows, indexes, views, and triggers into the destination, then initializes its private schema beside them.

It does **not** automatically:

- convert existing `BLOB` columns into content-addressed objects;
- move embedding columns into vector collections;
- derive graph nodes or edges from foreign keys;
- rewrite application queries; or
- change your durability PRAGMAs as application policy.

Your records remain ordinary SQLite records. New specialized values appear only when the migrated application writes them through Zova APIs.

## Plan the migration

Use a staged cutover:

1. Back up and validate the source SQLite file.
2. Inventory schema names and runtime PRAGMAs.
3. Convert into a new `.zova` destination.
4. Open the destination through the target Zova binding.
5. Run existing SQL tests unchanged where possible.
6. Add specialized storage one workflow at a time.
7. Exercise backup, restore, and deep diagnostics.
8. Keep the original SQLite file until the migrated release is proven.

This approach separates “can Zova preserve my relational application?” from “is my new object or retrieval model correct?”

## Convert to a new file

<Tabs groupId="programming-languages" defaultValue="rust">
  <TabItem value="rust" label="Rust">

```rust
zova::Database::convert_sqlite_to_zova(
    "app.sqlite",
    "app.zova",
)?;
```

  </TabItem>
  <TabItem value="python" label="Python">

```python
zova.convert_sqlite_to_zova("app.sqlite", "app.zova")
```

  </TabItem>
  <TabItem value="go" label="Go">

```go
err := zova.ConvertSqliteToZova("app.sqlite", "app.zova")
```

  </TabItem>
  <TabItem value="zig" label="Zig">

```zig
try zova.convertSqliteToZova("app.sqlite", "app.zova");
```

  </TabItem>
  <TabItem value="c" label="C ABI">

```c
#include "zova.h"

int main(void) {
    zova_message message = {0};
    const zova_convert_sqlite_to_zova_request request = {
        .source_path = "app.sqlite",
        .dest_path = "app.zova",
        .out_error_message = &message,
    };
    const zova_status status = zova_convert_sqlite_to_zova(&request);
    zova_message_free(&message);
    return status == ZOVA_OK ? 0 : 1;
}
```

  </TabItem>
</Tabs>

The destination must be a new `.zova` path. Zova refuses to overwrite an existing file. If the source uses names reserved for Zova's private schema, conversion fails instead of silently renaming application objects.

## Add object references deliberately

Suppose the old schema stores file bytes inline:

```sql
create table attachments(
  id integer primary key,
  filename text not null,
  content blob not null
);
```

Do not assume conversion moves `content`. Introduce an application-owned object reference and migrate through the object API:

```sql
alter table attachments add column object_id blob;
```

For each row, read the old bytes, call `put_object`, and update `object_id`. Keep the original column until the new read path and rollback strategy are verified. A later application migration can remove it.

The resulting model keeps filename and ownership in SQL while Zova stores immutable content by identity.

## Add vector references deliberately

Keep chunk text and source metadata relational:

```sql
create table chunks(
  id integer primary key,
  document_id integer not null,
  body text not null,
  vector_id text unique,
  embedding_model text
);
```

Create a collection matching the model's dimensions, metric, and element type. Write each embedding through Zova under a stable ID, then store that ID in the row. If the model changes, a new collection and migration are usually clearer than mutating the meaning of existing IDs.

## Preserve the query boundary

Existing metadata queries remain SQL:

```sql
select id, filename, object_id
from attachments
where id = ?1;
```

After selecting a row, resolve its object ID with the object API. For vector search, join ranked IDs back to the application table:

```sql
select c.id, c.document_id, c.body, s.distance
from zova_vector_search as s
join chunks as c on c.vector_id = s.vector_id
where s.collection = 'chunks'
  and s.query_vector = ?1
  and s.top_k = 10
order by s.rank;
```

This keeps access control, tenancy, document state, and presentation metadata in a schema the application controls.

## Verify before cutover

Run structural and deep checks:

```sh
zova check app.zova
zova check --deep app.zova
zova doctor app.zova
```

Then make and restore an operational copy:

```sh
zova backup app.zova app.backup.zova
zova restore app.backup.zova app.restored.zova
zova check --deep app.restored.zova
```

Compare representative query results between the original and converted databases. Test application startup, migrations, concurrent access, shutdown, and recovery under the same filesystem and journal configuration used in production.

## Common migration mistakes

- Renaming `app.sqlite` to `app.zova` instead of converting it.
- Editing `_zova_*` tables directly.
- Treating conversion as automatic BLOB or embedding migration.
- Deleting old data before the new references are verified.
- Assuming object or vector deletion cascades into application rows.
- Parsing CLI human output as a stable binding API.
- Forgetting that a pre-1.0 format upgrade may require newer Zova artifacts.

## Keep a rollback path

Conversion leaves the source untouched. Keep that original file and a compatible application build until the Zova path has passed correctness and recovery testing.

If migration fails, point the application back to the original SQLite file. Do not attempt to “convert back” by stripping private tables from the `.zova` destination. For production cutover, define how writes made after migration would be exported or replayed before you need that rollback.
