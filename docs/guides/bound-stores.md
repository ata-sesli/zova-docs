# Optional bound stores

A single `.zova` file is the default and simplest deployment. Optional stores let large object bytes, vector rows, or graph topology live beside the main records database while remaining part of one Zova handle.

## Supported layout

A main database may bind at most one object store, one vector store, and one graph store.

```sh
zova object-store create objects.zova
zova object-store bind main.zova objects.zova
zova vector-store create vectors.zova
zova vector-store bind main.zova vectors.zova
zova graph-store create graphs.zova
zova graph-store bind main.zova graphs.zova
```

After open, normal object, vector, and graph APIs route transparently. User SQL tables remain in the main file.

## Bind versus split

Use `bind` when the corresponding private storage in the main file is empty. A first bind is rejected if it would hide existing rows. Use `split` to migrate existing data:

```sh
zova split --objects main.zova objects.zova
zova split --vectors main.zova vectors.zova
zova split --graphs main.zova graphs.zova
```

The destination must not exist. Take a backup first; split is an explicit in-place local migration.

## Consistency checks

Zova records store identity, a bound-set ID, and per-store epochs. Open, `doctor`, and `check --deep` reject or report missing files, wrong stores, marker mismatches, and split states rather than silently continuing. Rebinding is the explicit way to update a moved store path.

:::warning[SQLite atomicity still applies]
Multi-file crash atomicity is limited by SQLite `ATTACH` and journal-mode rules. Bound stores are local placement—not distributed storage, cloud synchronization, automatic path repair, or a stronger transaction system.
:::
