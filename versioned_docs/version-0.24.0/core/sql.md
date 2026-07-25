# SQL access

SQLite is Zova's relational core. Use ordinary SQL for application tables and metadata, then use Zova's connection-local SQL helpers when specialized results need to join back to those records.

## Ordinary SQL stays ordinary

Prepared statements are the preferred interface for values:

```sql
select id, title, object_id
from documents
where owner_id = ?1
  and archived = 0
order by created_at desc;
```

Indexes, query plans, constraints, views, triggers, and PRAGMAs retain their SQLite behavior. Zova does not introduce a parallel query language for records.

Private `_zova_*` tables are not a public SQL API. Their shape can change with the file format. Use bindings or documented virtual tables instead of querying them directly.

## Vector distance in an expression

Zova registers scalar distance helpers on connections it opens:

```sql
zova_vector_distance(collection, vector_id, query_vector_blob)
zova_vector_distance_by_id(collection, vector_id, source_vector_id)
```

This form works well when SQL has already selected a small candidate set:

```sql
select
  c.id,
  c.body,
  zova_vector_distance('chunks', c.vector_id, ?1) as distance
from chunks as c
where c.document_id = ?2
order by distance
limit 10;
```

Here SQLite filters by `document_id` first, then Zova calculates distance only for matching vector IDs. Confirm the query plan and candidate count for your workload; a scalar function is not an approximate vector index.

## Ranked vector search as a table

Use `zova_vector_search` when ranking should produce the candidate set:

```sql
select
  c.id,
  c.document_id,
  c.body,
  s.distance
from zova_vector_search as s
join chunks as c on c.vector_id = s.vector_id
where s.collection = 'chunks'
  and s.query_vector = ?1
  and s.top_k = 10
order by s.rank;
```

The virtual table exposes vector IDs, distances, and deterministic rank. Joining on an indexed `vector_id` column reconnects ranking to application metadata without copying every record into application code.

For `f32` collections, query blobs contain little-endian `f32` values. `f16` uses little-endian `u16` bit patterns and `i8` uses raw signed bytes.

## Graph adjacency as a table

`zova_graph_neighbors` returns one-hop results:

```sql
select d.id, d.title, g.edge_type
from zova_graph_neighbors as g
join documents as d on d.graph_node_id = g.node_id
where g.graph_name = 'default'
  and g.source_node_id = ?1
  and g.direction = 'outgoing'
  and g."limit" = 20
order by g.rank;
```

`zova_graph_walk` performs a bounded walk and returns the start node plus reachable nodes:

```sql
select node_id, depth, predecessor_node_id, edge_type
from zova_graph_walk
where graph_name = 'default'
  and start_node_id = ?1
  and max_depth = 2
  and "limit" = 50
order by rank;
```

Use explicit limits and depth bounds. Joining graph IDs back to application tables remains your schema design responsibility.

## Connection-local registration

The scalar functions and virtual tables are registered on SQLite connections opened through Zova. A generic SQLite client can inspect your public tables, but it will not automatically know `zova_vector_search` or `zova_graph_walk`.

This boundary is important when using pools, migration tools, or external analytics software: run Zova-specific queries through a Zova-owned connection and keep portable application SQL independent where practical.

## Inspect page usage with dbstat

Zova's bundled SQLite enables the read-only `dbstat` virtual table for storage diagnostics:

```sql
select name, sum(pgsize) as bytes
from dbstat
group by name
order by bytes desc;
```

`dbstat` exposes page-level implementation details, not a stable Zova schema contract. Use it to measure and diagnose storage, but do not build application behavior around private `_zova_*` table names. Availability is guaranteed only on SQLite bundled with Zova; an unrelated system SQLite build may omit it.

## Query design guidance

- Use SQL-first ranking when indexed metadata produces a small candidate set.
- Use vector-first ranking when similarity should produce the candidates.
- Use graph virtual tables when traversal results must join directly to records.
- Keep user-controlled values in bound parameters.
- Order by the provided rank when deterministic traversal or search order matters.
- Inspect SQLite query plans for joins on application tables.

Continue with [Vector search](../guides/vector-search.md) or [Graph traversal](../guides/graph-traversal.md) for complete query workflows.
