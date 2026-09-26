## 🎯 Core Objectives & Non-Negotiables

You are working on **`elevator-app`**, a production-grade monorepo targeting a **Raspberry Pi 2** (1GB RAM, ARM architecture) running a bare-metal Node.js process managed by `systemd`.

### Critical Constraints

1. **Memory Budget:** Memory usage **must stay under 50MB RAM** on the Pi. Avoid heavy dependencies, unnecessary background workers, or memory-leaking closures.
2. **Native C/C++ Module Protection:**
   - `better-sqlite3` and `onoff` are compiled C modules.
   - **NEVER** attempt to bundle `better-sqlite3` or `onoff` into the compiled JS bundle. They **MUST** be marked as `external` in `tsup`/`esbuild` configurations.
3. **Database Path Immutability:**
   - The SQLite database **must strictly reside** at `/home/pi/gpio-app/gpio_data.db`.
   - **NEVER** place the `.db` file inside the relative release execution folder (`./`), as atomic OTA symlink rotations will orphan the database or create empty instances.
4. **Boot Migration Fail-Fast Rule:**
   - Database auto-migrations run synchronously via `drizzle-orm/better-sqlite3/migrator` during `server.ts` initialization before mounting HTTP routes.
   - If a migration throws an error, **call `process.exit(1)` immediately**. This ensures `systemd` fails the health check, triggering the OTA auto-rollback mechanism.

---

## 📁 Repository Structure Map

```text
elevator-app/
├── apps/
│   ├── server/                   # Hono + Node.js Backend
│   │   ├── src/
│   │   │   ├── db/               # Drizzle Schema & Migration Loader
│   │   │   │   ├── schema.ts
│   │   │   │   └── index.ts
│   │   │   ├── gpio/             # onoff Hardware Interrupts & EventEmitter
│   │   │   │   └── index.ts
│   │   │   ├── router/           # oRPC API Procedures
│   │   │   │   └── index.ts
│   │   │   └── server.ts         # Server Entrypoint (Boot sequence & SSE)
│   │   ├── drizzle/              # Generated SQL Migrations
│   │   └── tsup.config.ts        # Bundler Config (Externals enforced)
│   │
│   └── web/                      # React + TanStack Router Frontend
│       ├── src/
│       │   ├── routes/           # TanStack Router Pages (/live, /history)
│       │   └── main.tsx
│       └── vite.config.ts        # Vite + vite-plugin-pwa Setup
│
├── scripts/                      # Deployment & OTA Scripts
│   ├── build-release.sh
│   └── ota-update.sh
│
├── package.json
└── pnpm-workspace.yaml
```

# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `pnpm dlx ultracite fix`
- **Check for issues**: `pnpm dlx ultracite check`
- **Diagnose setup**: `pnpm dlx ultracite doctor`
- **Type check**: `pnpm check-types`
- **API tests**: `pnpm test:api`
- **Web tests**: `pnpm test:web`

## Verification Checklist

After completing every task, you MUST run these commands and ensure they all pass:

```bash
pnpm dlx ultracite fix && pnpm check-types && pnpm test:api && pnpm test:web
```

Biome (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Skill Index

Load the relevant domain skill **when editing, reading, or reviewing** files in its path. Skills auto-trigger via their description — also load manually with `skill` tool.

| Area           | Skill                                                        | Trigger (edit / read / review)                                                                                       | Covers                                                                        |
| -------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `apps/web`     | `frontend`                                                   | `apps/web/**`, `apps/web/src/modules/**`, TanStack Router, orpc, react-query, react-form, code review of web modules | Module Pattern, Routes, Forms, TanStack Query, Layouts, React & JSX (web)     |
| `packages/api` | `api`                                                        | `packages/api/**`, `packages/db/**`, oRPC, Drizzle                                                                   | Routers/handlers/schemas, `.route()` meta, `withErrorResponses`, PGlite tests |
| Any JS/TS      | `ultracite`                                                  | ultracite, lint, format, Biome/Eslint/Oxlint                                                                         | Code standards, fix/check/doctor commands                                     |
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

- **`apps/web` → `frontend` skill**: Module Pattern (Routes, `modules/<feature>/` structure, `index.ts` public API, 100-line limit), Forms (`@tanstack/react-form` + Zod factory with `TFunction`), TanStack Query ( `mutationOptions({ onSuccess: invalidateQueries })` not manual `refetch`, `IS_API_DATA_SOURCE ? query.isError : false`, stable deps), Layouts. Reference pattern: `apps/web/src/modules/branch/hooks/use-branches.ts` (landing in PR #45; placeholder `todos` module is not a valid reference).
- **`packages/api` → `api` skill**: Routers (`index.ts` + `schemas.ts` + `handlers/`), `*Service(db, ...)` + `*` procedure split, `.route()` OpenAPI meta + `withErrorResponses`, PGlite `testDb`/`resetTestData()` tests.

### Coupled dependencies

React/react-dom are pinned in the pnpm catalog (`pnpm-workspace.yaml`); bump both catalog entries together and keep workspace consumers on `catalog:` — do not reintroduce independent caret ranges for coupled deps.

Existing external skills remain authoritative for their areas and are referenced by domain skills rather than duplicated.

---

Most formatting and common issues are automatically fixed by Biome. After completing every task you MUST run the following command with a sub-agent if possible `pnpm dlx ultracite fix && pnpm check-types && pnpm test:api && pnpm test:web` to ensure compliance.
