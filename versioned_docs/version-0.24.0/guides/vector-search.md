# Vector search

Zova offers two exact-search paths: native APIs that return ranked vector IDs, and SQL helpers that join ranking directly to application records. Both use the collection's configured metric and return lower distances first.

The right path depends on where your candidate set and metadata policy live.

## Begin with the retrieval question

Assume a `chunks` collection contains embeddings and a SQL table contains their application context:

```sql
create table chunks(
  id integer primary key,
  document_id integer not null,
  body text not null,
  vector_id text not null unique,
  language text not null,
  visible integer not null default 1
);
```

A search request usually needs both numeric ranking and relational policy. For example: “find the ten nearest English chunks the current user may see.” Do not push permissions or changing business state into the vector value; keep them in SQL.

## Pattern 1: vector-first ranking

Use the `zova_vector_search` virtual table when similarity should produce the initial candidates:

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
  and s.top_k = 25
  and c.visible = 1
order by s.rank
limit 10;
```

The vector search ranks 25 candidates, then SQL removes invisible rows and returns ten. Requesting more candidates than the final result count can compensate for post-search filters, but it does not guarantee ten authorized results. Choose the oversampling amount from realistic data, or use a filter-first approach when policy is highly selective.

Index `chunks.vector_id` so the ranked IDs join efficiently.

## Pattern 2: SQL-first ranking

When an indexed relational predicate produces a small candidate set, calculate distance only for those rows:

```sql
select
  c.id,
  c.body,
  zova_vector_distance('chunks', c.vector_id, ?1) as distance
from chunks as c
where c.document_id = ?2
  and c.language = 'en'
  and c.visible = 1
order by distance
limit 10;
```

This is useful for one document, tenant, project, or other selective partition. Exact search still evaluates every surviving candidate, so inspect the SQLite query plan and benchmark the actual cardinality.

## Pattern 3: native candidate search

Use a binding's candidate-filtered search when application code already has the allowed vector IDs. This avoids asking Zova to scan unrelated vectors and keeps authorization outside the query.

Candidate-filtered search skips missing IDs and deduplicates repeated candidates. Bound the candidate list; passing nearly the entire collection has the cost profile of an exact collection scan plus candidate handling.

Native search is also the simplest path when no SQL join is needed—for example, a cache keyed directly by vector ID or a test that asserts deterministic ranking.

## Encode the query correctly

SQL query blobs must match the collection's element type:

| Collection | Query blob |
|---|---|
| `f32` | little-endian 32-bit floats |
| `f16` | little-endian `u16` IEEE-754 binary16 bit patterns |
| `i8` | raw signed bytes |

Zova does not convert an `f32` SQL blob into `f16` or quantize it for an `i8` collection. A dimension or representation mismatch is an input error, not an opportunity for implicit coercion.

## Search from an existing vector

Search-by-ID uses a stored vector as the query and excludes that source ID from its own results. This works well for “more like this” flows:

1. Resolve the current application's vector ID.
2. Search the same collection by that ID.
3. Join returned IDs to current metadata.
4. Reapply visibility and lifecycle policy.

Collection identity still matters. An ID in one collection does not select a vector from another collection with a different model or dimensions.

## Thresholds and score meaning

Threshold variants include results whose distance equals the threshold. Because lower is always better:

- cosine and L2 thresholds usually read naturally as a maximum distance;
- dot-product distance is `-dot_product`, so useful values may be negative.

Do not present raw distances as universal confidence percentages. Their distribution depends on the embedding model, metric, normalization, and dataset. Calibrate product thresholds on representative labeled examples.

## Exact search as a deliberate trade-off

Exact flat search gives deterministic results for the stored representation and avoids index build or recall tuning. Its work grows with the number of eligible vectors.

It is appropriate for local collections, offline ranking, correctness-sensitive tests, and selective SQL-first workflows. It is not an ANN index. If latency must remain flat across millions of vectors, Zova 0.24.0 does not provide the required indexing strategy.

Read [Vectors](../core/vectors.md) for collection and type semantics, and [SQL access](../core/sql.md) for connection-local helper behavior.
