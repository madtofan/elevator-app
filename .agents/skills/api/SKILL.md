---
name: api
description: "Backend API development for Elevator App. Use when editing, creating, reading, reviewing, or analyzing files in packages/api/**, packages/db/**, or when working with oRPC routers, handlers, schemas, ORPCError, Drizzle, createDb, Database, publicProcedure/protectedProcedure, or better-sqlite3 in-memory tests (testDb, resetTestData). Keywords: packages/api, routers, handlers, createDb, Database, publicProcedure, protectedProcedure, ORPCError, testDb, resetTestData"
---

# API Skill

Domain skill for `packages/api` and `packages/db` — Router/Handler patterns, OpenAPI metadata, and in-memory better-sqlite3 testing. Load this whenever you touch, read, or review backend code.

## Current Surface (`packages/api/src`)

- `index.ts` — exports `o`, `publicProcedure`, `protectedProcedure`. The auth middleware throws `ORPCError("UNAUTHORIZED")`.
- `context.ts` — `Context = { session, db, pinOutput?, publishPinChange? }`. The server assembles it in `apps/server/src/context.ts` from `createDb(ENV)`, the Better Auth session, and injected GPIO ports.
- `gpio.ts` — shared pin constants (`GPIO_INPUT_PIN`, `GPIO_OUTPUT_PIN`), `GpioState`/`GpioChangeEvent` types, and `toGpioState()`.
- `routers/index.ts` — assembles `appRouter` (`healthCheck`, `privateData`, `getPinState`, `togglePin`, `getHistory`).
- `test/db.ts` — in-memory `testDb` (migrations already applied) and `resetTestData()`.
- `test/__tests__/` and `routers/__tests__/` — Vitest tests.

## Routers (`packages/api/src/routers/<feature>/`)

- Each feature is a module folder (`pin/`, `history/`) grouping its handlers.
- Schemas live in a `schemas.ts` file at the feature level (Zod).
- Handlers live in a `handlers/` subfolder with kebab-case filenames.
- Register procedures in `routers/index.ts`. The repository convention is flat, top-level keys named after the public procedure (`getPinState`, `togglePin`, `getHistory`) so clients call `client.getPinState()`. Group under a feature key only when a feature exposes enough procedures to warrant namespacing.

## Handler Files (e.g., `handlers/list.ts`)

Each handler file exports two things:

1. **`*Service` function** — business logic that takes `Database` as its first argument. This is what unit tests call directly.
2. **`*` procedure** — the oRPC procedure that wires the service to `context.db`. Never open a second database connection inside a handler.

```ts
import type { Database } from "@elevator-app/db";
import { gpioHistory } from "@elevator-app/db/schema/history";
import { desc } from "drizzle-orm";

import { publicProcedure } from "../../../index";
import { listPinEventsSchema } from "../schemas";

export async function listPinEventsService(
  db: Database,
  input: { limit: number }
) {
  return await db
    .select()
    .from(gpioHistory)
    .orderBy(desc(gpioHistory.id))
    .limit(input.limit);
}

export const listPinEvents = publicProcedure
  .route({
    method: "GET",
    path: "/listPinEvents",
    summary: "List pin state transitions",
    description: "Returns the most recent pin state transitions.",
    tags: ["History"],
    successStatus: 200,
    successDescription: "Pin state transitions, newest first.",
  })
  .input(listPinEventsSchema)
  .handler(({ context, input }) => listPinEventsService(context.db, input));
```

See `routers/history/handlers/list.ts` (`getHistory`) for the implemented version, which also accepts `limit`/`offset` and returns `{ items, hasMore }`.

### Route Metadata

Every handler MUST include a `.route()` call with OpenAPI metadata. This powers the API reference at `/api-reference`.

**Required route properties:**

- `method` — HTTP method (`"GET"`, `"POST"`, `"PATCH"`, `"DELETE"`)
- `path` — RPC-style path matching the procedure's registered key (e.g., `"/getHistory"`, `"/togglePin"`)
- `summary` — Short summary of the endpoint
- `description` — Detailed description of what the endpoint does
- `tags` — Array of tag strings for grouping in the API reference (e.g., `["History"]`, `["GPIO"]`)
- `successStatus` — HTTP status code on success (200 for reads, 201 for creates)
- `successDescription` — Description of the success response

**Ordering:** Chain `.route()` before `.input()` and `.handler()`:

```
procedure.route(opts).input(schema).handler(fn)
procedure.route(opts).handler(fn)
```

### Errors

- Throw `ORPCError` for typed failures (e.g., `new ORPCError("NOT_FOUND")`), not plain `Error`.
- `protectedProcedure` already throws `UNAUTHORIZED` for missing sessions.
- There is no shared error-response helper yet. Add OpenAPI error documentation in `.route({ spec })` only when the API reference needs it.

### Imports

- Import `publicProcedure` / `protectedProcedure` relatively from `packages/api/src/index.ts` (`../../../index` from `routers/<feature>/handlers/`, `../../index` from `routers/<feature>/`).
- Use `@elevator-app/db` for `createDb`, the `Database` type, and `migrationsFolder`.
- Use `@elevator-app/db/schema/*` for table definitions and `drizzle-orm` for query helpers (`eq`, `desc`, ...).

## Testing API Services

- Use **Vitest**; run with `pnpm test:api`.
- The helper at `packages/api/src/test/db.ts` provides `testDb` (better-sqlite3 `:memory:` with migrations applied) and `resetTestData()` (deletes all rows; call it in `beforeEach` or `afterEach`).
- Tests are co-located at the router level in `__tests__/` (e.g., `routers/history/__tests__/list.test.ts`).
- Tests call `*Service` functions directly — no oRPC routing or HTTP layer.
- Seed test data via `testDb.insert(table).values(...)` and verify via `testDb.select()`.

```ts
import { afterEach, expect, it } from "vitest";

import { resetTestData, testDb } from "../../../test/db";
import { listPinEventsService } from "../handlers/list";

afterEach(() => {
  resetTestData();
});

it("returns seeded pin events", async () => {
  const rows = await listPinEventsService(testDb, { limit: 10 });
  expect(rows).toHaveLength(0);
});
```

### Database Migrations

- Schema lives in `packages/db/src/schema/`; migrations are generated with `pnpm db:generate` into `packages/db/src/migrations/`.
- `migrationsFolder` is exported from `@elevator-app/db` for the boot migrator and `testDb`.
- Never edit generated migrations by hand; change the schema and regenerate.

## Related Skills

- For Hono-specific routing/middleware see `hono` skill.
- For Better Auth see `better-auth-best-practices` skill.

## Checklist for Code Review (API)

When reviewing `packages/api` files, verify:

- [ ] Each handler exports `*Service(db, ...)` + `*` procedure with `.route()` before `.input()`/`.handler()`
- [ ] `.route()` has `method`, `path` (rpc-style), `summary`, `description`, `tags`, `successStatus`, `successDescription`
- [ ] Handlers use `context.db`, never a fresh `createDb()` call per request
- [ ] Errors use `ORPCError` not plain `Error`
- [ ] Tests call `*Service` directly with `testDb`, not via HTTP, and reset with `resetTestData()`
- [ ] Imports use `@elevator-app/db` and relative `packages/api/src/index.ts`, not deep internal paths
