# Infrastructure

Put future persistence adapters in `persistence/` and external adapters in
`external/`. Implement application ports; do not define application policy here.
Every executable file must import `server-only`, including this entry point.
No drivers, connections, queries, or fake implementations are provided.
