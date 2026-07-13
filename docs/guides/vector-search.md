# Vector search

Zova offers native exact search and SQL-native search. Both use the collection’s configured metric and return lower distances first.

## Native search

Use native APIs when the candidate set is already known by the application or when no SQL join is needed. Candidate-filtered search lets SQL or application logic narrow IDs before distance calculation.

## Join rankings to metadata

```sql
select c.id, c.text, s.distance
from zova_vector_search as s
join chunks as c on c.vector_id = s.vector_id
where s.collection = 'chunks'
  and s.query_vector = ?1
  and s.top_k = 10
order by s.rank;
```

The query blob encoding must match the collection: little-endian `f32`, little-endian binary16 bit patterns for raw `f16`, or signed bytes for raw `i8`.

## Filter-first pattern

For selective metadata constraints, first obtain a bounded candidate ID set, then use candidate-filtered vector search. Exact search still examines each supplied candidate, so benchmark realistic cardinalities.

:::note[No hidden approximation]
Results are exact for the stored representation. Zova 0.23.0 does not build ANN indexes or quantize values automatically.
:::
