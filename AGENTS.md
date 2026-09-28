## 🎯 Core Objectives & Non-Negotiables

You are working on **`elevator-app`**, a production-grade monorepo targeting a **Raspberry Pi 2** (1GB RAM, ARM architecture) running a bare-metal Node.js process managed by `systemd`.

### Critical Constraints

1. **Memory Budget:** Memory usage **must stay under 50MB RAM** on the Pi. Avoid heavy dependencies, unnecessary background workers, or memory-leaking closures.
2. **Native C/C++ Module Protection:**
   - `better-sqlite3` and `onoff` are native modules and **MUST** remain external in the server bundle.
   - They are enforced in `apps/server/tsdown.config.ts` via `deps.neverBundle: ["better-sqlite3", "onoff"]`. Never move them into `alwaysBundle` or import their internals.
   - `better-sqlite3` v13 ships N-API prebuilds for macOS/Linux/Windows on x64 and arm64 only. Both packages are listed as `false` in `pnpm-workspace.yaml` `allowBuilds` so dev machines never compile them; ARMv7 (Pi 2) requires an on-device source build (see README roadmap).
3. **Database Path Immutability:**
   - The database location comes from `DATABASE_PATH`. Production **must** use `/home/pi/gpio-app/gpio_data.db`.
   - Local development uses `../../local.db` (relative to `apps/server`).
   - **NEVER** place the `.db` file inside the relative release execution folder (`./`), as atomic OTA symlink rotations will orphan the database or create empty instances.
4. **Boot Migration Fail-Fast Rule (implemented):**
   - Boot migrations run synchronously in `apps/server/src/index.ts` via `runMigrations()` from `apps/server/src/db.ts` with `migrate()` from `drizzle-orm/better-sqlite3/migrator`, before mounting HTTP routes.
   - If a migration throws an error, **call `process.exit(1)` immediately**. This ensures `systemd` fails the health check, triggering the OTA auto-rollback mechanism.
   - **Bundled-asset trap:** `@elevator-app/*` modules are inlined by `alwaysBundle`, so any asset resolved via `import.meta.url` (e.g. `migrationsFolder`) resolves against `apps/server/dist` in the built artifact. Copy such assets with `copy` in `apps/server/tsdown.config.ts` (`packages/db/src/migrations` is the current case) and smoke-test `node dist/index.mjs` with a temp `DATABASE_PATH` before deploy — `tsx` dev mode masks the difference.
   - The `bun build --compile` path does not embed the migrations folder; deploy the Node artifact until the compile path handles assets.
5. **Hardware Init Non-Fatal Rule (implemented):**
   - `initGpioWatcher()` and any future peripheral init must catch load, construction, and watch-registration errors, log a warning with `console.warn`, and return `null`.
   - `apps/server/src/index.ts` awaits init at module top level, so an uncaught error rejects module evaluation and kills the process (systemd restart loop). **Only migrations may call `process.exit(1)`.**

---

## 📁 Repository Structure Map

```text
elevator-app/
├── apps/
│   ├── server/                   # Hono + Node.js Backend
│   │   ├── src/
│   │   │   ├── index.ts          # Server entrypoint (Hono app, oRPC handlers)
│   │   │   ├── db.ts             # SQLite client + runMigrations() boot migrator
│   │   │   ├── services.ts       # createAuth(ENV, db)
│   │   │   ├── context.ts        # oRPC context (db + Better Auth session)
│   │   │   └── env.server.ts     # Varlock env bootstrap
│   │   └── tsdown.config.ts      # Bundler Config (neverBundle for native deps)
│   │
│   └── web/                      # React + TanStack Router PWA
│       ├── src/
│       │   ├── routes/           # TanStack Router Pages
│       │   ├── utils/orpc.ts     # oRPC client + TanStack Query utils
│       │   └── main.tsx
│       └── vite.config.ts        # Vite + vite-plugin-pwa Setup
│
├── packages/
│   ├── api/                      # oRPC routers, services, Vitest tests
│   ├── auth/                     # Better Auth setup (Drizzle adapter)
│   ├── config/                   # Shared tsconfig
│   ├── db/                       # Drizzle schema, migrations, createDb
│   └── ui/                       # Shared shadcn/ui primitives
│
├── scripts/                      # Deployment & OTA scripts (planned, not implemented yet)
├── package.json
└── pnpm-workspace.yaml
```

# Code Standards & Verification

This project uses **Biome** for linting and formatting (configured in `biome.json`).

## Quick Reference

- **Format + fix**: `pnpm check`
- **Type check**: `pnpm check-types`
- **API tests**: `pnpm test:api`
- **Server tests**: `pnpm test:server`
- **Web tests**: `pnpm test:web`

## Verification Checklist

After completing every task, you MUST run these commands and ensure they all pass:

```bash
pnpm check && pnpm check-types && pnpm test:api && pnpm test:server && pnpm test:web
```

Biome fixes most formatting and common lint issues automatically. Do not run ad-hoc formatters.

---

## Skill Index

Load the relevant domain skill **when editing, reading, or reviewing** files in its path. Skills auto-trigger via their description — also load manually with `skill` tool.

| Area           | Skill                                                        | Trigger (edit / read / review)                                                                                       | Covers                                                                        |
| -------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `apps/web`     | `frontend`                                                   | `apps/web/**`, `apps/web/src/modules/**`, TanStack Router, orpc, react-query, react-form, code review of web modules | Module Pattern, Routes, Forms, TanStack Query, Layouts, React & JSX (web)     |
| `packages/api` | `api`                                                        | `packages/api/**`, `packages/db/**`, oRPC, Drizzle                                                                   | Routers/handlers/schemas, `.route()` meta, in-memory SQLite tests             |
| UI components  | `shadcn`                                                     | shadcn/ui, components.json, presets                                                                                  | Component composition, styling, CLI                                           |
| Perf / React   | `vercel-react-best-practices`, `vercel-composition-patterns` | React performance, composition                                                                                       | Vercel 70-rule guides                                                         |

If `AGENTS.md` and a skill disagree, the skill is authoritative for its domain. Do not duplicate skill content here.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.
Always use Typescript and never use Javascript in the project

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names
- Never combine `!` with `??`/`||` — `value! ?? fallback` asserts non-null then null-coalesces, making the fallback dead to TS (runtime fallback still works but intent is obscured). Use `value ?? fallback` without `!`; if a value truly needs `!`, do not provide a fallback

### Modern TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Use `Link` from `@tanstack/react-router` for all internal navigation instead of `<a href>` — `<Link to="/login">` for routes and `<Link to="/" hash="features">` for same-page anchors. Reserve `<a>` for external links only.
- Do not update the default Shadcn component directly, create a new component in the `apps` directory and build on top of it. If it is referenced by multiple modules, put it in `components` folder
- If possible, use tailwind classes to make the styling rather than creating a newclass in globals.css
- Merge tailwind classes using the `cn` util function
- Minimize the usage of pixel sizing but use the default tailwind sizing (eg: use `-bottom-2` rather than `bottom-[-0.5rem]`. Only use pixel sizing where it truly requires.
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)

### Framework-Specific Guidance

**React 19+:**

- Use ref as a prop instead of `React.forwardRef`

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Biome Can't Help

Biome's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

## Project Conventions

For detailed, copy-pasteable patterns, load the domain skill that matches the files you are touching — including when **reading or reviewing** code for review feedback.

- **`apps/web` → `frontend` skill**: Module Pattern (Routes, `modules/<feature>/` structure, `index.ts` public API, 100-line limit), Forms (`@tanstack/react-form` + Zod schemas), TanStack Query (`mutationOptions({ onSuccess: invalidateQueries })` not manual `refetch`, stable deps), Layouts. Routes in `apps/web/src/routes/` stay thin and delegate to modules; `apps/web/src/utils/orpc.ts` is the API client.
- **`packages/api` → `api` skill**: Routers (`index.ts` + `schemas.ts` + `handlers/`), `*Service(db, ...)` + `*` procedure split, `.route()` OpenAPI meta, in-memory better-sqlite3 `testDb`/`resetTestData()` tests at `packages/api/src/test/db.ts`.

### Testing

- Vitest is the test runner. `pnpm test:api` runs `packages/api`; `pnpm test:web` runs `apps/web`.
- API tests call `*Service(testDb, ...)` functions directly — no HTTP layer. Reset state with `resetTestData()`.
- Web modules add `__tests__/` folders for pure business logic; `apps/web` currently passes with no tests (`--passWithNoTests`).

### Coupled dependencies

React/react-dom are pinned in the pnpm catalog (`pnpm-workspace.yaml`); bump both catalog entries together and keep workspace consumers on `catalog:` — do not reintroduce independent caret ranges for coupled deps.

Native packages (`better-sqlite3`, `epoll` for `onoff`) are `false` in `allowBuilds`; do not flip them on dev machines.

Existing external skills remain authoritative for their areas and are referenced by domain skills rather than duplicated.

---

Most formatting and common issues are automatically fixed by Biome. After completing every task you MUST run `pnpm check && pnpm check-types && pnpm test:api && pnpm test:server && pnpm test:web` to ensure compliance.
