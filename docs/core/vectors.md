# Vectors

Vectors store numeric representations used for similarity ranking. In Zova, vectors live in named collections while descriptions, permissions, source records, and other application metadata remain in SQL.

Zova 0.24.0 performs deterministic exact search. It compares the query against every eligible vector rather than using an approximate nearest-neighbor index.

## Collections define the contract

Every collection fixes three properties:

| Property | Meaning |
|---|---|
| Dimensions | the required number of elements in every vector |
| Metric | cosine, Euclidean L2, or dot-product distance |
| Element type | `f32`, raw IEEE-754 `f16` bits, or raw signed `i8` bytes |

Vector identity is the collection name plus an application-provided text ID. Choose an ID that is stable and easy to join back to application records, such as `document:7:chunk:2`.

```rust
use zova::{
    Database, VectorCollectionOptions, VectorElementType,
    VectorInput, VectorMetric, VectorValues,
};

let mut db = Database::create("search.zova")?;
db.create_vector_collection(
    "chunks",
    VectorCollectionOptions {
        dimensions: 3,
        metric: VectorMetric::Cosine,
        element_type: VectorElementType::F32,
    },
)?;
```

Collection settings cannot vary per vector. If an embedding model changes dimensions or representation, create a separate collection and migrate application references deliberately.

## Store metadata beside vector IDs

The vector itself is not a document record:

```sql
create table chunks(
  id integer primary key,
  document_id integer not null,
  body text not null,
  vector_id text not null unique,
  embedding_model text not null
);
```

The SQL row can be filtered, indexed, updated, and joined normally. The vector ID connects that row to the numeric value Zova ranks.

```rust
db.put_vectors(
    "chunks",
    &[
        VectorInput {
            id: "chunk:1",
            values: VectorValues::F32(&[1.0, 0.0, 0.0]),
        },
        VectorInput {
            id: "chunk:2",
            values: VectorValues::F32(&[0.8, 0.2, 0.0]),
        },
    ],
)?;
```

Batch upsert reduces call overhead and makes the intended unit of work explicit. Reusing an ID updates that vector according to the binding contract; it does not rewrite your SQL metadata row.

## Understand distance

All three metrics use **lower distance is better**:

- Cosine distance is `1 - cosine_similarity`.
- L2 distance is Euclidean distance.
- Dot distance is the negative dot product.

The negative sign for dot distance keeps result ordering consistent, but it also means valid threshold values can be negative. Threshold comparisons are inclusive.

Choose the metric required by the model that produced the vector. Do not switch metrics merely because the names sound similar; normalization and training assumptions affect the meaning of the scores.

## Run exact search

```rust
let results = db.search_vectors(
    "chunks",
    VectorValues::F32(&[1.0, 0.0, 0.0]),
    10,
)?;

for result in results {
    println!("{}: {}", result.id, result.distance);
}
```

Search is deterministic and supports top-k, inclusive distance thresholds, candidate filtering, search by an existing vector ID, and batch writes. For larger result sets, v0.24 uses adaptive top-k selection internally while preserving exact distances and deterministic result ordering. Candidate-filtered search is useful when SQL or application policy has already narrowed the allowed IDs.

Exact search is a good fit for local datasets, offline ranking, deterministic tests, and SQL-filter-first workflows. It is not an ANN engine for million-scale, low-latency retrieval. If that scale is a hard requirement, evaluate the limitation before committing to Zova's vector layer.

## Join ranking to application records

Connections opened through Zova register a read-only `zova_vector_search` virtual table:

```sql
select
  c.id,
  c.body,
  s.distance
from zova_vector_search as s
join chunks as c on c.vector_id = s.vector_id
where s.collection = 'chunks'
  and s.query_vector = ?1
  and s.top_k = 10
order by s.rank;
```

For an `f32` collection, bind `query_vector` as little-endian `f32` bytes. Typed collections require a blob matching their element representation. The [vector search guide](../guides/vector-search.md) develops SQL-first and vector-first query patterns in detail.

## Typed storage is not automatic quantization

`f16` collections accept raw little-endian IEEE-754 binary16 bit patterns carried as `u16` values. `i8` collections accept signed bytes. Zova does not calculate scales or zero points, quantize an `f32` vector, rerank results, or preserve a hidden original vector.

Use these representations only when the producing model and your application already agree on their meaning.

## Lifecycle and boundaries

Deleting a collection removes Zova-owned vectors in that collection. It does not delete SQL rows that reference their IDs. Zova also does not generate embeddings; supply vectors produced by your own model or pipeline.

Start with vectors in the main database. Optional bound vector stores change local file placement, not the collection or search APIs.

Format 8 stores compact private collection keys and keeps each vector's cached norm beside its values. These are private storage optimizations: collection names, vector IDs, metrics, distances, and public APIs remain unchanged. Format-7 vector tables are not a supported SQL interface and are not migrated in place.
