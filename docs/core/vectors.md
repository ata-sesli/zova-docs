# Vectors

Vectors live in named collections. Each collection fixes its dimensions, distance metric, and element representation.

| Setting | Values |
|---|---|
| Metric | cosine, L2, dot |
| Element type | `f32`, raw `f16`, raw `i8` |
| Identity | application-provided text ID |

```rust
use zova::{VectorCollectionOptions, VectorMetric};

db.create_vector_collection(
    "chunks",
    VectorCollectionOptions { dimensions: 384, metric: VectorMetric::Cosine },
)?;
db.put_vector("chunks", "document:7:chunk:2", &embedding)?;
```

## Search behavior

Zova 0.23.0 performs exact flat search. Results are deterministic and support top-k, inclusive distance thresholds, candidate filtering, search by vector ID, and batch upsert. Exact search is useful for local datasets and correctness-sensitive ranking, but it is not an ANN index for million-scale low-latency workloads.

Raw `f16` and `i8` collections store the values you provide. Zova does not quantize, attach scales or zero points, or rerank automatically.

## Metrics

- cosine distance: `1 - cosine_similarity`
- L2 distance: Euclidean distance
- dot distance: negative dot product, so lower remains better

