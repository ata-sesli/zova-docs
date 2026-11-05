# C ABI

The C ABI is Zova's language-neutral integration boundary. Use it from C, Go, or another language that can call a static native library. Include the `zova.h` and link the matching `libzova_c.a` from the same release archive.

## A first program

This program creates an in-memory database, stores bytes as an object, records the object ID in a SQL row, and reads the bytes back. Every call takes a request struct and returns a `zova_status`:

```c title="hello.c"
#include <stdio.h>
#include <string.h>
#include "zova.h"

#define CHECK(db, call)                                                     \
    do {                                                                    \
        zova_status status_ = (call);                                       \
        if (status_ != ZOVA_OK) {                                           \
            fprintf(stderr, "%s: %s\n", zova_status_name(status_),          \
                    (db) ? zova_database_last_error_message(db) : "");      \
            return 1;                                                       \
        }                                                                   \
    } while (0)

int main(void) {
    zova_database *db = NULL;
    zova_message open_error = {0};
    zova_database_open_request open = {":memory:", &db, &open_error};
    if (zova_database_create(&open) != ZOVA_OK) {
        fprintf(stderr, "create failed: %.*s\n", (int)open_error.len, open_error.data);
        zova_message_free(&open_error);
        return 1;
    }

    zova_database_exec_request exec = {
        db, "create table notes(id integer primary key, title text, object_id blob)"};
    CHECK(db, zova_database_exec(&exec));

    const char *body = "Hello from Zova";
    zova_object_id id;
    zova_object_put_request put = {db, (const uint8_t *)body, strlen(body), &id};
    CHECK(db, zova_object_put(&put));

    zova_statement *insert = NULL;
    zova_database_prepare_request prepare = {
        db, "insert into notes(title, object_id) values (?1, ?2)", &insert};
    CHECK(db, zova_database_prepare(&prepare));
    zova_statement_bind_text_request title = {insert, 1, (const uint8_t *)"hello.txt", 9};
    CHECK(db, zova_statement_bind_text(&title));
    zova_statement_bind_blob_request object = {insert, 2, id.bytes, sizeof id.bytes};
    CHECK(db, zova_statement_bind_blob(&object));
    zova_step_result step;
    zova_statement_step_request step_request = {insert, &step};
    CHECK(db, zova_statement_step(&step_request));
    CHECK(db, zova_statement_finalize(insert));

    zova_buffer bytes = {0};
    zova_object_get_request get = {db, id, &bytes};
    CHECK(db, zova_object_get(&get));
    printf("%.*s\n", (int)bytes.len, (const char *)bytes.data);
    zova_buffer_free(&bytes);

    CHECK(NULL, zova_database_close(db));
    return 0;
}
```

Compile it against the archive's header and static library, then run it. It prints `Hello from Zova`:

```sh
cc -std=c11 -I/path/to/zova-c-abi/include hello.c \
  -L/path/to/zova-c-abi/lib -lzova_c -o hello
./hello
```

## API at a glance

`zova.h` in the release archive is the authoritative contract. The main entry points by task:

| Task | Functions |
|---|---|
| Open and close | `zova_database_create`, `zova_database_open`, `zova_database_create_memory`, `zova_database_close`, `zova_database_last_error_message`, `zova_status_name` |
| Run SQL | `zova_database_exec`, `zova_database_prepare`, `zova_statement_bind_text`, `_bind_int64`, `_bind_blob`, `zova_statement_step`, `zova_statement_column_text`, `_column_int64`, `_column_blob`, `zova_statement_finalize` |
| Transactions | `zova_database_begin`, `zova_database_begin_immediate`, `zova_database_commit`, `zova_database_rollback`, `zova_database_savepoint`, `zova_database_rollback_to_savepoint`, `zova_database_release_savepoint` |
| Objects | `zova_object_put`, `zova_object_get`, `zova_object_read_range`, `zova_object_delete`, `zova_object_writer_create`, `zova_object_seekable_reader_create`, `_read`, `_seek`, `_destroy` |
| Key-value | `zova_kv_put`, `zova_kv_get`, `zova_kv_delete` |
| Vectors | `zova_vector_collection_create`, `zova_vector_put_many`, `zova_vector_search`, `zova_vector_search_by_id`, `zova_vector_delete_many` |
| Graphs | `zova_graph_create`, `zova_graph_node_put`, `zova_graph_edge_put`, `zova_graph_edge_put_many`, `zova_graph_neighbors`, `zova_graph_walk`, `zova_graph_edge_delete_many` |
| App events | `zova_database_listen`, `zova_subscription_try_receive`, `zova_database_notify` |
| Copies and space | `zova_database_backup`, `zova_database_backup_with_progress`, `zova_database_compact`, `zova_database_compact_with_progress`, `zova_database_restore`, `zova_database_reclaim` |
| Formats | `zova_database_probe_format`, `zova_database_migrate`, `zova_database_migrate_with_progress`, `zova_database_migrate_with_extensions`, `zova_convert_sqlite_to_zova` |

## Handle-based design

Database, statement, object writer, listener, and result values use opaque handles. Callers do not depend on Zig struct layouts or reach into SQLite internals.

Functions return `zova_status`. On failure, retrieve the documented error information before performing another operation that may replace handle-local diagnostics. Never infer success from a non-null output when the status reports an error.

Request structs use explicit fields and lengths rather than C string assumptions where binary or borrowed data is involved. Fixed-width types keep IDs and numeric layout predictable across callers.

## Ownership is part of the API

The header documents whether input is borrowed, output is caller-provided, or a returned allocation is owned by Zova. Lists, buffers, object manifests, vectors, graph results, and diagnostic outputs must be released with their matching `zova_*_free` function.

Do not use the C runtime's `free` on Zova-owned memory and do not retain borrowed callback arguments after the callback returns. Pair every successful handle creation with its documented close or free operation, including failure paths after later setup steps.

## Concurrency

Calls through one database handle are internally serialized. This protects the handle; it does not create parallel SQLite execution. Use multiple database handles when the host needs concurrent database work and account for SQLite locking between them.

Avoid holding application locks across Zova calls unless lock ordering is defined, especially when callbacks can re-enter application code.

## Scalar SQL callbacks

The C ABI can register scalar SQL functions on Zova-owned connections. Callback arguments are borrowed only for the call, and Zova copies result bytes according to the result contract.

A callback must not re-enter the same `zova_database` handle. Re-entry can violate serialization and SQLite callback assumptions. If a callback needs external state, provide it through the documented user-data lifetime rather than global mutable state.

## Extensions and artifact choice

C ABI artifacts can verify, trust, supply, and load external `.zovaext` bundles with `zova_database_create_with_extensions` and `zova_database_open_with_extensions`. Generated-C builds include the same loader as native Zig builds on Linux, macOS, and Windows.

A host that links plugin code into its own process can pass `zova_plugin_descriptor_v1` pointers to `zova_database_create_with_plugins`, `zova_database_open_with_plugins`, and `zova_database_open_for_extension_upgrade_with_plugins`, optionally together with trusted bundle paths. Linked descriptors need no bundle and no trust record. `zova_database_migrate_with_extensions` accepts the same bundles and descriptors for format migration. See the [Extension reference](../reference/extension-api.md#c-abi-host-surface).

`zova_database_migrate_with_progress` carries the same extension fields as `zova_database_migrate_with_extensions`.

## Maintenance, progress, and seekable reads

The C ABI also provides:

- `zova_database_reclaim`, which releases free pages in place from members in incremental auto-vacuum mode;
- `zova_database_backup_with_progress`, `zova_database_compact_with_progress`, and `zova_database_migrate_with_progress`, whose request structs carry a `zova_progress_fn` callback and its `user_data`; and
- `zova_object_seekable_reader_create`, `zova_object_seekable_reader_read`, `zova_object_seekable_reader_seek`, and `zova_object_seekable_reader_destroy`.

A non-zero return from the progress callback cancels the operation, which fails with status `ZOVA_INTERRUPTED` (18) and publishes nothing. A null callback behaves like the existing functions, which are unchanged. The C layer forwards the first event of each phase and member, whole-percent changes, and the event that completes the group. Code that switches over every `zova_status` value should handle `ZOVA_INTERRUPTED`.

The release header is the authoritative symbol and struct contract. Do not copy declarations from examples into a separate local header.

## Atomic batch deletion

`zova_vector_delete_many` and `zova_graph_edge_delete_many` delete in batches. Both validate the complete request before mutating storage, join an active Zova transaction when one exists, and otherwise run the batch in one Zova-owned transaction. Missing vectors or exact edges are ignored, so retrying a successfully applied deletion is safe.

The request arrays and their strings are borrowed only for the call. Use a matching header and static library together.

## Low-level graph publication

The C ABI also exposes opaque node and edge keys, paged topology scans, edge payloads, prepared graph builds, and atomic fresh-build sessions. These are additive low-level publication APIs for applications that need high-throughput graph construction.

Opaque keys are database-local row identities, not portable application IDs. A key becomes invalid when its row is deleted or its transaction or unfinished fresh-build session rolls back. Public graph names, node IDs, edge-type strings, traversal ordering, and incremental graph APIs remain the stable application-facing model.

The advanced graph surfaces are also declared by raw `zova-sys`. They are stable low-level 1.x contracts and are deliberately not wrapped by the high-level JavaScript, Python, Go, or safe Rust APIs.
