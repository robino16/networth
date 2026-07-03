# Net Worth Tracker — Agent Guide

Manual net worth tracker. Users log account balances (snapshots) at a point in time; no transaction history.

## Architecture

```
backend/
  core/          # Domain models, ports (abstract repos), use cases
  infra/         # SQLite repository implementations
  presentation/  # FastAPI routers and request/response schemas
  app/           # FastAPI app factory and startup

frontend/
  app/           # Next.js App Router pages
  components/    # UI components (shadcn/ui + domain-specific)
  lib/           # API client, TypeScript types
```

## Key Domain Concepts

- **Account** — a named financial account with a type and ownership percentage
- **Snapshot** — a point-in-time balance for one account, split into `deposit` (innskudd) and `unrealized_return` (urealisert avkastning)
- **AccountType** — `bank | savings | loan | funds | stocks | crypto | real_estate | other`
- Loans are stored as negative `deposit` values
- `ownership_pct` (0–1) handles shared assets (e.g. 0.5 for a jointly-owned home)

## Tools & Conventions

- Backend: `uv` for Python deps, `sqlite3` (stdlib) for DB, Pydantic v2 models
- Frontend: `bun` for JS deps, shadcn/ui components, recharts for graphs
- API base URL: `http://localhost:8000/api`
- DB file: `backend/networth.db`
