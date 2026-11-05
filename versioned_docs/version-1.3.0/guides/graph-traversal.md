# Graph traversal

Zova provides two traversal shapes: neighbors for one-hop adjacency and walk for bounded breadth-first reachability. Both return stable node IDs that application code or SQL can reconnect to records.

Traversal works best when the graph models a small vocabulary of explicit relationships and every public request has meaningful bounds.

## Choose neighbors or walk

Use neighbors when the question is one edge away:

- attachments of this message;
- parent project of this document;
- entities mentioned by this chunk; or
- records that point to this object.

Use a walk when the question spans a known small number of hops:

- dependencies within three levels;
- supporting evidence within two relationships; or
- descendants under a bounded hierarchy.

Do not use a walk merely because it is more general. One-hop adjacency has a simpler result and a tighter cost boundary.

## Query outgoing neighbors

```sql
select
  m.id,
  m.body,
  g.edge_type
from zova_graph_neighbors as g
join messages as m on m.graph_node_id = g.node_id
where g.graph_name = 'default'
  and g.source_node_id = 'message:123'
  and g.direction = 'outgoing'
  and g."limit" = 20
order by g.rank;
```

The visible `node_id` is the neighboring node, while `source_node_id` is the query input. Joining by a unique indexed `graph_node_id` reconnects topology to current record state.

Use `incoming` to find edges whose target is the source node. Use `both` only when the domain question truly ignores direction; it performs outgoing and incoming work and can return a larger neighborhood.

## Filter by relationship type

When a node participates in several relationships, filter to the edge vocabulary the request needs. For example, a message might `mentions` an entity, `has_attachment` an object, and `belongs_to` a conversation.

Edge filtering prevents unrelated topology from consuming the result limit. Prefer specific stable names over a generic `related` edge whose meaning changes by caller.

## Run a bounded walk

```sql
select
  node_id,
  depth,
  predecessor_node_id,
  edge_type
from zova_graph_walk
where graph_name = 'default'
  and start_node_id = 'message:123'
  and edge_type_filter = 'mentions'
  and max_depth = 2
  and "limit" = 50
order by rank;
```

The walk returns the start node at depth zero, followed by reachable nodes in deterministic breadth-first order. `predecessor_node_id` and `edge_type` describe the selected shortest-hop path used to reach each result.

In a graph with multiple equal-length paths, deterministic order chooses one predecessor; the result is not a list of every possible path. If your application needs complete path enumeration or weighted shortest paths, implement that domain algorithm explicitly or use a graph system designed for it.

## Reconstruct a selected path

For a returned node, follow `predecessor_node_id` backward through the result set until reaching the start node. Because each result records depth, a valid predecessor should appear one level earlier.

Store results by node ID while reconstructing. Do not treat rank alone as a durable graph identity; rank describes one traversal response.

## Apply authorization after traversal

Topology is not a permission system. A node being reachable does not mean the current user may read its record.

A safe query or application flow is:

1. Traverse with a strict depth and result limit.
2. Join or resolve returned node IDs against application tables.
3. Apply tenancy, visibility, deletion, and policy predicates there.
4. Return only authorized records.

If filtering can remove many results, request a carefully bounded larger traversal set or redesign the graph so sensitive domains do not share unnecessary topology. Never encode secrets directly into node IDs.

## Bound work intentionally

Depth and result limits protect the request from cycles and high-degree nodes. Select them from domain behavior rather than arbitrary large defaults.

For example, “two citation hops, at most 100 facts” is a meaningful product boundary. “Depth 100, limit 100,000 just in case” turns a local relationship query into an unpredictable scan.

CLI inspection follows the same principle:

```sh
zova graph-neighbors --limit 20 app.zova default message:123
zova graph-walk --max-depth 2 --limit 50 app.zova default message:123
```

## Keep graph and records coherent

Zova validates targets it owns, such as object and vector IDs. It cannot validate every application record namespace. When graph nodes target SQL rows:

- choose stable namespaced IDs;
- store the node ID or target reference in the application row;
- test deletion and migration workflows; and
- run application-level reconciliation when records can be removed independently.

Read [Graphs](../core/graphs.md) for the data model and [Diagnostics](../operations/diagnostics.md) for structural validation and salvage behavior.
