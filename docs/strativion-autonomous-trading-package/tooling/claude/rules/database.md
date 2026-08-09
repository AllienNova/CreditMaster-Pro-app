---
paths:
  - "db/**/*.py"
  - "migrations/**/*.py"
  - "repositories/**/*.py"
---

# Database and Repository Rules (Strativion PCTT Platform)

## Repository Pattern
- ALL database access goes through repository classes. No raw SQL outside repository modules.
- One repository class per aggregate root (e.g., `TradeRepository`, `SignalRepository`, `AccountRepository`).
- Repository methods are `async`. Use `async with session.begin():` for transaction blocks.
- Never use manual `commit()` or `rollback()`. The context manager handles transaction lifecycle.

## SQLAlchemy 2.0 Style
- Use the 2.0 query API: `select()`, `insert()`, `update()`, `delete()` statement constructors.
- Do NOT use the legacy `session.query()` API anywhere.
- No ORM lazy loading. Use `selectinload()` or `joinedload()` for all relationship access.
- Connection pooling: async engine with `pool_size=10`, `max_overflow=20`, `pool_pre_ping=True`.

## Schema and Migrations
- Alembic for ALL schema migrations. Never modify tables with raw DDL outside of Alembic.
- Every migration has a descriptive message: `alembic revision --autogenerate -m "add_stop_loss_tracking_to_trades"`.
- Migration files must be idempotent. Include `IF NOT EXISTS` guards where applicable.
- Every PostgreSQL table maps to a `SSOT-DB-XX` section. Reference the tag in the model docstring.

## Audit and Compliance
- All trade-related tables MUST have these columns: `created_at` (timestamptz), `updated_at` (timestamptz), `audit_id` (UUID).
- `created_at` defaults to `func.now()`. `updated_at` uses an `onupdate` trigger.
- `audit_id` is a UUID v4 generated at insert time for regulatory traceability.
- Delete operations on trade data use soft delete (`is_deleted` flag), never hard delete.

## Redis Usage
- Key naming convention: `strativion:{domain}:{entity}:{id}` (e.g., `strativion:agent:risk:memory`).
- TTLs are mandatory on all Redis keys:
  - Hot memory keys (agent state, live signals): 24 hours.
  - Session keys (user sessions, temporary state): 1 hour.
  - Cache keys (computed metrics, aggregations): TTL matches data freshness requirement.
- Use Redis Streams for event publishing between agents, not pub/sub.
- Serialize Redis values as JSON. Use `orjson` for fast serialization.

## Indexing Strategy
- Composite indexes on `(symbol, timestamp)` for ALL time-series tables.
- Partial indexes for active/open records: `WHERE is_closed = FALSE`.
- GIN indexes on JSONB columns used for querying (agent metadata, signal parameters).
- Review query plans with `EXPLAIN ANALYZE` before adding new queries to repositories.

## Cold Storage and Archival
- Parquet archival: write daily, partitioned by date and symbol.
- Archival runs after market close. Do not archive during trading hours.
- Archived data is queryable via DuckDB for historical analysis without loading into PostgreSQL.
- Retention policy: PostgreSQL hot storage keeps 90 days. Parquet cold storage keeps 7 years.
