---
name: api
description: "Backend API development for Elevator App. Use when editing, creating, reading, reviewing, or analyzing files in packages/api/**, packages/db/**, or when working with oRPC routers, handlers, schemas, withErrorResponses, ORPCError, Drizzle/Prisma/Mongoose, createDb, DbClient, publicProcedure/protectedProcedure, or API testing with PGlite. Keywords: packages/api, routers, handlers, createDb, DbClient, publicProcedure, protectedProcedure, withErrorResponses, ORPCError"
---

# API Skill

Domain skill for `packages/api` and `packages/db` — Router/Handler patterns, OpenAPI metadata, and PGlite testing. Load this whenever you touch, read, or review backend code.

## Routers (`packages/api/src/routers/<feature>/`)

- Each router is a module folder with an `index.ts` that assembles handlers.
- Schemas live in a `schemas.ts` file at the router level.
- Handlers live in a `handlers/` subfolder with kebab-case filenames.

## Handler Files (e.g., `handlers/create.ts`)

Each handler file exports two things:

1. **`*Service` function** — pure business logic that takes a `DbClient` as its first argument. This is what unit tests call directly.
2. **`*` handler** — the oRPC procedure that wires the service to the real DB via `createDb()`.

```ts
import type { DbClient } from "@elevator-app/db";
import { createDb } from "@elevator-app/db";
import { publicProcedure } from "@/procedures";

export async function createTodoService(db: DbClient, text: string) {
  const [row] = await db.insert(todo).values({ text }).returning();
  return row;
}

export const createTodo = publicProcedure
  .route({
    method: "POST",
    path: "/todo.create",
    summary: "Create a todo item",
    description: "Creates a new todo item with the given text.",
    tags: ["Todo"],
    successStatus: 201,
    successDescription: "The created todo item.",
  })
  .input(schema)
  .handler(async ({ input }) => {
    const db = createDb();
    return await createTodoService(db, input.text);
  });
```

### Route Metadata

Every handler MUST include a `.route()` call with OpenAPI metadata. This powers the API reference documentation at `/api-reference`.

**Required route properties:**

- `method` — HTTP method (`"GET"`, `"POST"`, `"PATCH"`, `"DELETE"`)
- `path` — RPC-style path matching the router key hierarchy (e.g., `"/todo.create"`, `"/chat.listRooms"`)
- `summary` — Short summary of the endpoint
- `description` — Detailed description of what the endpoint does
- `tags` — Array of tag strings for grouping in the API reference (e.g., `["Todo"]`, `["Chat"]`)
- `successStatus` — HTTP status code on success (200 for reads, 201 for creates)
- `successDescription` — Description of the success response

**Error responses:**
Use the `withErrorResponses` helper (imported from `"../../../with-error-response"`) in the `spec` property to document expected error responses. Protected procedures must always document `401`. Procedures that throw specific `ORPCError` codes must document those as well.

```ts
import { withErrorResponses } from "../../../with-error-response";

export const getRoom = protectedProcedure
  .route({
    method: "GET",
    path: "/chat.getRoom",
    summary: "Get chat room details",
    description: "Returns a chat room with its participants.",
    tags: ["Chat"],
    successStatus: 200,
    successDescription: "Chat room with participants.",
    spec: withErrorResponses({
      "401": "Authentication required.",
      "403": "Not a participant of the room.",
      "404": "Room not found.",
    }),
  })
  .input(getRoomSchema)
  .handler(async ({ context, input }) => { ... })
```

**Ordering:** Chain `.route()` before `.input()` and `.handler()`:

```
procedure.route(opts).input(schema).handler(fn)
procedure.route(opts).handler(fn)  // when no input schema
```

### Imports

- Use relative imports to import `publicProcedure` / `protectedProcedure` (e.g., `from "../../../procedures"`).
- Use `@elevator-app/db` for `createDb`, `DbClient` type, and `eq` helper.
- Use `@elevator-app/db/schema/*` for table definitions.

## Testing API Services

- Use **Vitest** for in-memory DB tests.
- Test helper at `packages/api/src/test/db.ts` provides `testDb` and `resetTestData()`.
- Tests are co-located at the router level in `__tests__/` (e.g., `routers/todo/__tests__/create.test.ts`).
- Tests call `*Service` functions directly — no oRPC routing or HTTP layer needed.
- Seed test data via `testDb.insert()` and verify via `testDb.select()`.

Example:

```ts
import { testDb, resetTestData } from "@/test/db";
import { createTodoService } from "../handlers/create";

beforeEach(() => resetTestData());

it("creates a todo", async () => {
  const row = await createTodoService(testDb, "Buy milk");
  expect(row.text).toBe("Buy milk");
  const rows = await testDb.select().from(todo);
  expect(rows).toHaveLength(1);
});
```

## Related Skills

- For Hono-specific routing/middleware see `hono` skill.
- For Better Auth see `better-auth-best-practices` skill.

## Checklist for Code Review (API)

When reviewing `packages/api` files, verify:

- [ ] Each handler exports `*Service(db, ...)` + `*` procedure with `.route()` before `.input()`/`.handler()`
- [ ] `.route()` has `method`, `path` (rpc-style), `summary`, `description`, `tags`, `successStatus`, `successDescription`
- [ ] Protected routes document `401`; all thrown `ORPCError` codes are in `withErrorResponses` spec
- [ ] Errors use `ORPCError` not plain `Error` (typed status for client)
- [ ] Tests call `*Service` directly with `testDb`, not via HTTP
- [ ] Imports use `@elevator-app/db` and relative `procedures`, not deep internal paths
