# C ABI

The C ABI is Zova’s language-neutral integration layer. Include `zova.h` and link the matching `libzova_c.a` release artifact.

## Conventions

- Database, statement, writer, listener, and result types use opaque handles.
- Functions return `zova_status`; retrieve diagnostic messages through the documented error APIs.
- Requests use explicit structs and lengths rather than relying on language-specific layouts.
- IDs use fixed-width representations.
- Returned buffers, lists, manifests, vectors, and graph results are Zova-owned and require the matching `zova_*_free` function.

## Concurrency and callbacks

Calls through one database handle are internally serialized. Open multiple handles for true SQLite concurrency. App-defined scalar SQL callbacks receive borrowed arguments valid only during the callback; Zova copies result bytes. A callback must not re-enter the same database handle.

Dynamic external extension loading works only in native Zig-built C ABI artifacts. Generated-C snapshots keep compatible symbols but report loading as unavailable.

