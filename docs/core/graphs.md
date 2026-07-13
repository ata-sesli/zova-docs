# Graphs

Graphs represent explicit directed relationships between stable application IDs. They are useful when an application repeatedly asks “what is connected to this item?” or “what can I reach within a small number of hops?”

```text
message:123 --has_attachment--> object:8f…
message:123 --embedded_as--> vector:chunks:message-123
fact:991 --supported_by--> chunk:document-7:12
```

## Design rules

A graph has a name. Nodes have application-provided string IDs, and edges have a source, target, and edge type. Graph rows hold topology and small routing fields; titles, permissions, timestamps, and other metadata stay in SQL.

Zova validates graph names, node IDs, edge types, endpoint existence, and Zova-owned targets such as object or vector IDs. It cannot infer whether an arbitrary user-table row exists; that contract belongs to the application.

## Traversal

Native APIs support neighbors and bounded directional walks. SQL virtual tables expose the same shapes for joining returned node IDs to application tables. Walk results include depth, predecessor, edge type, and deterministic rank.

:::note[Scope]
Zova is a graph-aware embedded store, not Neo4j. It does not implement Cypher, GQL, Gremlin, SPARQL, automatic entity extraction, or unbounded distributed traversal.
:::
