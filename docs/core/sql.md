# SQL access

Zova keeps SQLite as the relational core and registers additional read-only helpers on connections opened through Zova.

## Normal SQL

Use ordinary SQL for application tables and metadata filtering. Prepared statements remain the preferred interface for untrusted values.

## Vector helpers

`zova_vector_distance` and `zova_vector_distance_by_id` calculate distance in expressions. The `zova_vector_search` virtual table exposes ranked exact search that can join back to application records.

## Graph helpers

`zova_graph_neighbors` exposes one-hop adjacency. `zova_graph_walk` exposes bounded traversal, including the starting node.

These helpers are connection-local registrations. Open the file through Zova rather than a generic SQLite client when queries depend on them.

## Policy boundary

SQLite SQL, locking, transactions, and PRAGMAs keep their documented behavior. Zova does not silently tune journaling or durability. Treat query plans and indexes on user tables as application responsibilities.

