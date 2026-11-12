# Application

Place use-case interfaces in `use-cases/`, input/output DTOs in `dtos/`, and
outbound contracts in `ports/`. Use cases depend on ports and domain concepts,
never on concrete adapters. Export only stable consumer contracts through
`public.ts`; never re-export infrastructure or implementation details.
Use `Result` for expected failures and module-owned error code unions.
No placeholder use-case implementation or repository behavior is provided.
