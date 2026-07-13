# Objects

Objects store immutable byte sequences by content identity:

```text
ObjectId = SHA-256(full object bytes)
```

Putting identical bytes produces the same object ID. Zova splits data with FastCDC-v1 and deduplicates chunks within the same object store.

## Available workflows

- put and get a complete object;
- stream bytes with `ObjectWriter`;
- read a byte range without loading the entire object;
- inspect manifests and fetch verified chunks;
- store loose chunks and assemble an object; and
- delete an object plus chunks no longer referenced by another object.

```rust
let mut writer = db.object_writer()?;
writer.write(b"first part")?;
writer.write(b"second part")?;
let object_id = writer.finish()?;
```

## Ownership boundary

Zova owns object manifests and chunks. Your application owns rows that refer to object IDs. Object deletion never scans user tables, so enforce referential lifecycle in application code or SQL triggers.

Deleting data frees SQLite pages but may not shrink the file. Create an explicit compact copy when physical size matters.

:::note[Deduplication scope]
Deduplication is local to the active object store. Zova does not perform global, network, or cross-file deduplication.
:::
