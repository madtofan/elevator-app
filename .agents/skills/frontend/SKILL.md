---
name: frontend
description: "Frontend web development for Elevator App. Use when editing, creating, reading, reviewing, or analyzing files in apps/web/**, or when working with TanStack Router, TanStack Query, orpc queryOptions/mutationOptions, queryClient, invalidateQueries, @tanstack/react-form, Zod schemas, hooks in apps/web/src/modules, or during frontend code review. Keywords: apps/web, modules, live, history, orpc, queryClient, invalidateQueries, mutationOptions"
---

# Frontend Skill

Domain skill for `apps/web` — Module Pattern, Forms, and TanStack Query conventions. Load this whenever you touch, read, or review frontend code.

## Current Surface (`apps/web/src`)

- `routes/` — `index.tsx`, `login.tsx`, `_auth/route.tsx`, `_auth/dashboard.tsx`, and `__root.tsx` (header, theme, session-aware shell).
- `components/` — cross-cutting components (`header`, `loader`, `mode-toggle`, `user-menu`, auth forms).
- `utils/orpc.ts` — the oRPC client (`orpc`, `client`, `queryClient`) and TanStack Query utils.
- `lib/auth-client.ts` — Better Auth client.
- Planned modules per the product spec: `live` (GPIO state) and `history` (pin event log).

## Module Pattern

When adding or refactoring frontend code in `apps/web`, follow these rules:

### Routes

- Routes are thin entry points that delegate to module page/screen components.
- Never put business logic, styles, or complex JSX in route files.
- **Web (TanStack Router)**: Pass the module's page component directly to `createFileRoute` when possible. Use a thin `RouteComponent` wrapper only when the route needs router context (e.g., session, loader data).

  ```tsx
  import { createFileRoute } from "@tanstack/react-router";
  import { HistoryPage } from "@/modules/history";

  export const Route = createFileRoute("/history")({
    component: HistoryPage,
  });
  ```

### Modules (`apps/web/src/modules/<feature>/`)

- Each module represents a domain feature (e.g., `live`, `history`).
- Module structure:
  ```
  <feature>/
  ├── index.ts          # Public API - only exports needed externally
  ├── page.tsx           # Web route component (assembles module components)
  ├── components/        # Components used only within this module
  ├── hooks/             # Custom hooks (business logic, data fetching)
  ├── lib/               # Pure helper functions (ideal for unit testing)
  ├── __tests__/         # Unit tests for this module's business logic
  ├── constants.ts       # Module-specific constants
  ├── schemas.ts         # Zod schemas for form validation (create when the module has a form)
  └── types.ts           # Module-specific types
  ```
- **Keep files under ~100 lines.** If a file grows larger, split it into smaller, focused pieces.
- **index.ts controls exports**: Only export components, hooks, and types that other modules need. Keep internals private.
- **Cross-cutting components** that are used by multiple modules live in `apps/web/src/components/`, not in modules.
- **Module folders use singular nouns** (e.g., `live`, `history`, `settings`).

### Testing (Web)

- Business logic is extracted into pure functions in `lib/` or into custom hooks in `hooks/`.
- Unit test files live in a `__tests__/` folder at the module root (e.g., `modules/history/__tests__/format-event.test.ts`).
- Use **Vitest** (`pnpm test:web`).
- Focus unit tests on business logic functions and hooks, not UI rendering.
- `apps/web` currently runs with `--passWithNoTests`; adding a module with business logic means adding its `__tests__/`.

### Forms

- **All forms use [`@tanstack/react-form`](https://tanstack.com/form) with [Zod](https://zod.dev) for validation.** Do not use `react-hook-form`, plain `useState` for form state, or any other form library.
- `@tanstack/react-form` is already a dependency in `apps/web`.
- Extract Zod schemas into `schemas.ts` at the module root:

  ```ts
  import z from "zod";

  export const createPinModeSchema = z.object({
    mode: z.enum(["input", "output"]),
    debounceMs: z.number().int().min(0).max(1000),
  });

  export type PinModeFormValues = z.infer<typeof createPinModeSchema>;
  ```

- Use `useForm` with `validators.onChange` for natural, real-time validation that only surfaces errors after a field is touched:

  ```tsx
  const form = useForm({
    defaultValues: { mode: "input", debounceMs: 10 },
    onSubmit: async ({ value, formApi }) => {
      await mutateAsync(value);
      formApi.reset();
    },
    validators: { onChange: createPinModeSchema },
  });
  ```

- Use `authClient.useSession` (TanStack Query pattern) or `authClient.getSession` (promise) from `apps/web/src/lib/auth-client.ts`.
- Render each field with `<form.Field name="...">` and only display errors when `field.state.meta.isTouched && field.state.meta.errors.length > 0`.
- Derive form value types from the Zod schema with `z.infer` rather than maintaining manual interfaces.

### Layouts

- Layout components live in route files (e.g., `routes/__root.tsx`, `routes/_auth/route.tsx`).
- Layouts are NOT modules. They serve as structural wrappers for the route tree.
- Do not move layout logic into the modules folder.

## React & JSX (Frontend)

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Use `Link` from `@tanstack/react-router` for all internal navigation instead of `<a href>` — `<Link to="/login">` for routes and `<Link to="/" hash="features">` for same-page anchors. Reserve `<a>` for external links only.
- Do not update the default Shadcn component directly, create a new component in the `apps` directory and build on top of it. If it is referenced by multiple modules, put it in `components` folder
- If possible, use tailwind classes to make the styling rather than creating a newclass in globals.css
- Merge tailwind classes using the `cn` util function
- Minimize the usage of pixel sizing but use the default tailwind sizing (eg: use `-bottom-2` rather than `bottom-[-0.5rem]`. Only use pixel sizing where it truly requires.
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Use semantic HTML and ARIA attributes for accessibility
- Base UI `ToggleGroup` is **always** array-valued (`value: readonly Value[]`, `onValueChange: (Value[]) => void`), even in default single-select (`multiple={false}`). Use `value={[range]}` + `const [next] = value` with an empty-deselect guard — never Radix-style `value={range}` / `type="single"` (destructuring a string `"30"` would yield `"3"`).

For shadcn components see `shadcn` skill. For React performance patterns see `vercel-react-best-practices` and `vercel-composition-patterns` skills.

## TanStack Query Guidelines

Use TanStack Query via the oRPC utils (`orpc.*.queryOptions()` / `orpc.*.mutationOptions()`) exported from `apps/web/src/utils/orpc.ts` for all data fetching in `apps/web`.

### 1. Declare cache side-effects in `mutationOptions({ onSuccess })`

Never do manual `await mutateAsync(); await query.refetch()` inside business-logic callbacks. Move the cache update into the mutation definition so it is declarative, success-only, and shared across all call sites.

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const queryClient = useQueryClient();

const setPinMutation = useMutation(
  orpc.gpio.setPin.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.gpio.getState.queryKey() });
    },
    onError: (error) => toast.error(error.message),
  }),
);
```

- Apply the same to update mutations.
- Expose `setPinMutation.isPending` / `isError` to dialogs for loading and error states instead of only `query.isLoading`.
- Always add `onError` with user-facing feedback; silent failures are not acceptable.

### 2. Do not wrap `query.refetch` in `useCallback` with the whole query object

```ts
// Bad — causes identity churn
const refetch = useCallback(async () => await historyQuery.refetch(), [
  historyQuery,
]);
```

`historyQuery` is a new object on data changes, so the wrapper churns and forces every dependent callback to churn. Prefer:

- Direct exposure: `return { retry: historyQuery.refetch }` (stable per TanStack Query), or
- Preferred for retries: `queryClient.invalidateQueries({ queryKey: orpc.history.list.queryKey() })` — respects `enabled`, `staleTime`, and deduplicates across mounts.

### 3. Prefer `queryClient.invalidateQueries` over imperative `query.refetch()`

- `refetch()` forces a network call even when cache is fresh.
- `invalidateQueries` marks stale and lets `staleTime`/`refetchOnMount` decide, shares cache across multiple consumers, and does not fire for disabled queries.
- For multi-query retries use distinct invalidations instead of `Promise.all([a.refetch(), b.refetch(), c.refetch()])`.

### 4. Stabilize dependencies

After moving to `onSuccess`, dependency arrays shrink to the stable mutation object:

```ts
// Bad
}, [historyQuery, setPinMutation]);

// Good
}, [setPinMutation]);
```

Never depend on whole query objects; depend only on `queryClient` or the mutation itself. This prevents unnecessary re-renders and `useEffect` loops.

## Checklist for Code Review (Frontend)

When reviewing `apps/web` files, verify:

- [ ] Routes are thin delegates to `modules/<feature>/page.tsx`
- [ ] Module respects the 100-line limit and `index.ts` public API
- [ ] Forms use `@tanstack/react-form` + Zod schemas from `schemas.ts`, not `react-hook-form`
- [ ] Mutations use `onSuccess: invalidateQueries` not manual `refetch` after `mutateAsync`
- [ ] No `useCallback(() => query.refetch(), [query])` wrappers
- [ ] `Link` from `@tanstack/react-router` used for internal nav, `cn()` for tailwind, deps correct
