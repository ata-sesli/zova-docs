# App events

App events are explicit same-process notifications tied to a database handle. They help one component tell another to reload data after a committed storage workflow.

```rust
let mut listener = db.listen("message:1:attachments")?;
db.begin_immediate()?;
let object_id = db.put_object(b"attachment")?;
// Store object_id in an application row.
db.notify("message:1:attachments", "changed")?;
db.commit()?;
let event = listener.try_receive()?.unwrap();
```

## Delivery semantics

Notifications queue after commit. Transaction rollback discards them; savepoint rollback discards events created inside the rolled-back scope. The API is polling-only through receive/drain operations.

Channels are restricted ASCII names up to 128 bytes. Payloads are UTF-8 text up to 64 KiB. Each subscription holds 1024 events; overflow drops the oldest and reports the drop count with the next delivered event.

:::note[Deliberately local]
Events are not cross-process delivery, persistence, replay, replication, audit logging, or automatic mutation observation. Graph writes do not emit events unless the application calls `notify`.
:::
