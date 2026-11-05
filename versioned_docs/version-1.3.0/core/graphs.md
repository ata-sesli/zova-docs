# Graphs

Graphs store explicit directed relationships between stable application identities. Use them when an application repeatedly asks questions such as “what is connected to this item?” or “what can I reach within two hops?”

Zova's graph layer complements relational data. It does not replace application records, infer entities, or provide a general graph query language.

## Model relationships, not documents

A graph contains named nodes and directed, typed edges:

```text
message:123 --has_attachment--> object:8f…
message:123 --embedded_as--> vector:chunks:message-123
entity:person:alice --mentioned_in--> message:123
fact:991 --supported_by--> chunk:document-7:12
```

Node IDs come from the application. Prefixes such as `message:`, `object:`, and `entity:` are conventions that prevent unrelated identity domains from colliding and make exported topology easier to understand.

Keep titles, permissions, timestamps, and mutable state in SQL. A graph node may point at that record, but topology should contain only stable routing information needed to traverse relationships.

## Create a graph and its nodes

```rust
use zova::{
    Database, GraphEdgeInput, GraphNodeInput,
    GraphTargetType, DEFAULT_GRAPH_NAME,
};

let mut db = Database::open("app.zova")?;

if !db.has_graph(DEFAULT_GRAPH_NAME)? {
    db.create_graph(DEFAULT_GRAPH_NAME)?;
}

db.put_graph_node(GraphNodeInput {
    graph_name: DEFAULT_GRAPH_NAME,
    node_id: "message:123",
    kind: "message",
    target_type: GraphTargetType::Record,
    target_namespace: Some("messages"),
    target_ref: Some("123"),
})?;

db.put_graph_node(GraphNodeInput {
    graph_name: DEFAULT_GRAPH_NAME,
    node_id: "entity:zova",
    kind: "entity",
    target_type: GraphTargetType::Entity,
    target_namespace: None,
    target_ref: Some("zova"),
})?;
```

The target fields describe what a node represents. Zova can validate targets it owns, including objects, chunks, and vectors. It cannot infer whether `messages.id = 123` exists in an arbitrary application table; that reference is your contract.

## Add directed edges

Both endpoint nodes must exist before adding an edge:

```rust
db.put_graph_edge(GraphEdgeInput {
    graph_name: DEFAULT_GRAPH_NAME,
    from_node_id: "message:123",
    edge_type: "mentions",
    to_node_id: "entity:zova",
})?;
```

Direction is semantic. `message:123 --mentions--> entity:zova` does not automatically imply a reverse `mentioned_in` edge. Traversal can move incoming or outgoing without duplicating an inverse edge, so add inverse edges only when they represent a distinct domain relationship.

Use a small, documented vocabulary for edge types. Ad hoc names such as `related` tend to become ambiguous as an application grows.

## Neighbors and bounded walks

A neighbor query returns one-hop adjacency. A walk performs breadth-first traversal up to a maximum depth and result limit. Walk results contain:

- the returned node ID;
- depth from the start node;
- predecessor node selected by deterministic traversal order;
- edge type used to reach it; and
- deterministic rank.

Always bound traversal. Local graphs are finite, but a high-degree node or accidental cycle can still make an unbounded application algorithm expensive.

For one-hop joins, use the SQL virtual table registered on Zova connections:

```sql
select m.id, m.body, g.edge_type
from zova_graph_neighbors as g
join messages as m on m.graph_node_id = g.node_id
where g.graph_name = 'default'
  and g.source_node_id = 'message:123'
  and g.direction = 'outgoing'
  and g."limit" = 20
order by g.rank;
```

For a bounded walk:

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

`zova_graph_walk` includes the starting node, then reachable nodes in deterministic breadth-first order. Read [Graph traversal](../guides/graph-traversal.md) for direction, filters, joining, and modeling trade-offs.

## Validation and deletion

Zova validates graph names, node IDs, edge types, endpoint existence, and Zova-owned targets. Deep diagnostics can identify invalid topology and target references without printing arbitrary user rows.

Format-9 handles enable SQLite foreign-key enforcement for private graph endpoints. Deleting a node cascades to its incident private edges. Public node IDs, edge ordering, traversal results, and error behavior remain stable.

## Format-9 publication APIs

Format 9 stores edge types through a private dictionary and can attach one opaque payload BLOB to each authoritative edge without duplicating it into adjacency indexes. Public APIs continue to accept and return edge-type strings.

The C ABI and raw `zova-sys` expose database-local opaque node and edge keys, paged topology scans, payload reads and replacement, prepared graph construction, and atomic fresh-build sessions. These APIs are intended for high-throughput local publication. Opaque keys are not portable identifiers and do not replace application-owned node IDs.

The established graph CRUD, batch, neighbor, degree, and walk APIs remain the incremental and replay path. High-level JavaScript, Rust, Python, and Go bindings deliberately do not expose the advanced low-level publication surfaces in v1.3.0.

Application-owned references still require application checks. If graph nodes target SQL records, add tests or maintenance queries that compare the two identity sets.

Node IDs may appear in diagnostics and exports. Avoid embedding secrets or unnecessary personal data in them; use opaque, stable identifiers when privacy matters.

## Scope of the graph layer

Zova provides graph creation, node and edge CRUD, neighbors, and bounded directional walks. It does not implement Cypher, GQL, Gremlin, SPARQL, pattern matching, distributed traversal, or automatic relationship extraction from documents or LLM output.

That limited surface is intentional: it gives embedded applications a relationship layer that participates in the same local storage and diagnostics model without turning Zova into a graph server.
