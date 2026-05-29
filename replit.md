# ClickHouse Monitor

A ClickHouse database monitoring and alerting system with user management, alert rules, resolution methods, and real-time alert management.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- DB schema: `lib/db/src/schema/index.ts` — 6 tables: `ck_users`, `ck_alert_rules`, `ck_alerts`, `ck_resolution_methods`, `ck_settings`, `ck_connection`
- API routes: `artifacts/api-server/src/routes/` — auth, users, rules, alerts, methods, settings (includes connection)
- Frontend: `artifacts/ck-monitor/src/` — React+Vite+Tailwind; contexts in `src/contexts/`

## Architecture decisions

- All app data persisted in PostgreSQL via Drizzle ORM; frontend fetches from API at `/api/*`
- `ck_settings` and `ck_connection` are single-row tables using `id=1` with `ON CONFLICT DO UPDATE` upsert
- `severity_range`, `steps`, `tags` columns on resolution methods are `jsonb` arrays; API layer casts them to `string[]`
- Passwords stored as plain text (demo app — not production-ready)
- Session only stored in `localStorage` (just the logged-in user info); all other data comes from API

## Product

- Role-based access control: admin, operator, viewer
- Alert rules: CRUD with severity, aggregation type, time window, and recommended resolution method
- Alert management: grouped by type, paginated, with acknowledgement/resolution workflow
- Resolution methods: step-by-step playbooks linked to alert rules
- System settings and ClickHouse connection config persisted in DB
- 50 sample alerts + 5 rules + 5 resolution methods + 3 users seeded on first run

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run `pnpm --filter @workspace/db run push` after changing schema, then re-seed if needed
- API server must be restarted after adding new route files (build step bundles everything)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
