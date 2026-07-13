# Graph traversal

Choose neighbors for a single hop and walk for bounded breadth-first reachability. Always provide a meaningful limit; graph inspection and public query helpers are intentionally bounded.

## One-hop neighbors

```sql
select m.body, g.edge_type
from zova_graph_neighbors as g
join messages as m on m.graph_node_id = g.node_id
where g.graph_name = 'default'
  and g.source_node_id = 'message:123'
  and g.direction = 'outgoing'
  and g."limit" = 20
order by g.rank;
```

## Bounded walk

```sql
select node_id, depth, predecessor_node_id, edge_type
from zova_graph_walk
where graph_name = 'default'
  and start_node_id = 'message:123'
  and edge_type_filter = 'mentions'
  and max_depth = 2
  and "limit" = 50
order by rank;
```

The walk returns the start node at depth zero plus reachable nodes. Predecessors describe the selected shortest-hop path in deterministic BFS order. Direction may be outgoing, incoming, or both.

## Modeling advice

Use stable, namespaced IDs such as `message:123` and edge types with application meaning. Keep mutable or large attributes in SQL and join by node ID. Avoid encoding permissions solely in topology; filter authorized records in application SQL.

