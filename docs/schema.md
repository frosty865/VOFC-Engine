# VOFC Engine Database Schema (for AI)

**Core Tables**
- `sources`: authoritative source list (UUID PK, reference_number unique)
- `options_for_consideration`: OFCs (UUID PK)
- `ofc_sources`: bridge linking OFCs to sources (UUID PK, composite unique (ofc_id, source_id))

**Fetch Logic**
- Use `select(...).eq(...)` joins through Supabase, never raw SQL.
- Join via `ofc_sources.source_id → sources.id`
- Validate `[cite: #]` via `sources.reference_number`.
