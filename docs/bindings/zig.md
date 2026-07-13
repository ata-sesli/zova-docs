# Zig

Zig users can call the native facade directly and can also use the public thin SQLite wrapper.

```zig
const zova = @import("zova");

var db = try zova.Database.create("app.zova");
defer db.deinit();
try db.exec("create table notes(id integer primary key, body text)");
```

Zova development targets Zig 0.16.0 or newer. The native API exposes the widest surface, including store management, extension registry integration, trusted bundle loading, and low-level profile/debug paths not intended as stable high-level binding contracts.

Use `defer` consistently for databases, prepared statements, allocated results, listeners, and writers. Errors propagate through Zig error unions; do not retain SQLite-owned or callback-borrowed memory beyond its documented lifetime.

