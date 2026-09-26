# 🛗 Elevator App (`elevator-app`)

A lightweight, real-time Raspberry Pi 2 GPIO controller and monitoring system. Built on a low-footprint **Node.js + Hono + oRPC** backend and a **React + TanStack Router PWA** frontend using the **Better-T-Stack** monorepo architecture.

Engineered specifically to run on resource-constrained hardware (< 50MB RAM ceiling) with atomic Over-The-Air (OTA) updates and auto-rollback capability.

---

## 🏗️ System Architecture

┌─────────────────────────────────────────────────────────────────────────┐
│ Raspberry Pi 2 │
│ │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Hono Server (Node.js) │ │
│ │ │ │
│ │ ├── Auto-Migrations ──► SQLite (/home/pi/gpio-app/gpio_data.db) │
│ │ ├── GPIO Watcher ──► Hardware Interrupts (onoff) │ │
│ │ ├── oRPC API Router ──► Read / Toggle / History │ │
│ │ ├── SSE Stream ──► /api/gpio/sse Real-time Bus │ │
│ │ └── Static Server ──► Serves React PWA Bundle (dist/) │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────▲────────────────────────────────────┘
│ HTTP / SSE / oRPC
┌────────────────────────────────────┴────────────────────────────────────┐
│ Client (iOS / Android / Desktop) │
│ │
│ React + TanStack Router PWA (Installable via Add to Home Screen) │
└─────────────────────────────────────────────────────────────────────────┘

---

## 🛠️ Tech Stack

| Domain                         | Technology                                    |
| :----------------------------- | :-------------------------------------------- |
| **Monorepo / Package Manager** | `pnpm` workspaces + `Nx`                      |
| **Backend Framework**          | Hono (`@hono/node-server`) running on Node.js |
| **API Layer**                  | oRPC (End-to-end type safety)                 |
| **Database & ORM**             | SQLite (`better-sqlite3`) + Drizzle ORM       |
| **Hardware Driver**            | `onoff` (Linux sysfs/epoll edge interrupts)   |
| **Frontend Framework**         | React + Vite + TanStack Router                |
| **PWA Engine**                 | `vite-plugin-pwa` (Workbox)                   |
| **Authentication**             | Better Auth (`better-auth`)                   |
| **Code Formatting**            | Biome                                         |

---

## ⚡ Key Features

- **Hardware Edge Interrupts:** Listens for pin state changes (LOW $\leftrightarrow$ HIGH) at the Linux kernel level with 10ms hardware debouncing.
- **Real-time SSE Event Bus:** Streams pin state transitions instantly to all connected PWAs via Server-Sent Events without polling.
- **Persistent History Log:** SQLite database records all pin state transitions with ISO-8601 timestamps.
- **Zero-Downtime Atomic OTA Updates:** Daily `systemd` timer checks Cloudflare Workers/R2 for new releases, extracts them to versioned folders, swaps atomic symlinks, and performs automatic HTTP health check rollbacks if booting fails.
- **Installer-less PWA:** Fully installable on iOS and Android without Apple/Google developer accounts.

---

### Prerequisites

- **Node.js:** `v18.x` or higher
- **Package Manager:** `pnpm` (`npm i -g pnpm`)
- **Target Hardware:** Raspberry Pi 2 (ARMv7 or ARMv8) running Linux (Raspberry Pi OS)

## Getting Started

First, install the dependencies:

```bash
pnpm install
```

## Database Setup

This project uses SQLite with Drizzle ORM.

1. Start the local SQLite database (optional):

```bash
pnpm run db:local
```

2. Update your `.env` file in the `apps/server` directory with the appropriate connection details if needed.

3. Apply the schema to your database:

```bash
pnpm run db:push
```

Then, run the development server:

```bash
pnpm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).

## UI Customization

React web apps in this stack share shadcn/ui primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`

### Add more shared components

Run this from the project root to add more primitives to the shared UI package:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from "@elevator-app/ui/components/button";
```

### Add app-specific blocks

If you want to add app-specific blocks instead of shared primitives, run the shadcn CLI from `apps/web`.

## Environment Configuration

Each app owns its environment schema in `.env.schema`. Varlock generates `src/env.ts` during installation; run `pnpm run env:generate` after changing a schema. Commit schemas, and keep secrets in ignored env files or your deployment platform.

Import the generated `ENV` accessor in application code. Shared database and auth packages receive configuration or initialized clients from the application. See [Varlock's monorepo guide](https://varlock.dev/guides/monorepos/).

Bun's automatic env loading is disabled in `bunfig.toml`; the framework integration or server bootstrap loads Varlock. Node deployments must include Varlock and its dependencies alongside the app schema.

Run standalone Node/Bun tools that use Varlock from the owning app directory so they load that app's schema and env files. `env:generate` only generates TypeScript files; it does not initialize environment values in a subsequent command.

## Git Hooks and Formatting

- Run checks: `pnpm run check`

## Project Structure

```
elevator-app/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Router)
│   └── server/      # Backend API (Hono, ORPC)
├── packages/
│   ├── ui/          # Shared shadcn/ui components and styles
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `pnpm run dev`: Start all applications in development mode
- `pnpm run build`: Build all applications
- `pnpm run dev:web`: Start only the web application
- `pnpm run dev:server`: Start only the server
- `pnpm run check-types`: Check TypeScript types across all apps
- `pnpm run db:push`: Push schema changes to database
- `pnpm run db:generate`: Generate database client/types
- `pnpm run db:migrate`: Run database migrations
- `pnpm run db:studio`: Open database studio UI
- `pnpm run db:local`: Start the local SQLite database
- `pnpm run check`: Run Biome formatting and linting
- `cd apps/web && pnpm run generate-pwa-assets`: Generate PWA assets

## Better Auth Schema Generation

After changing auth plugins or schema options, run `pnpm run auth:generate` from the project root. The script runs the Better Auth CLI through `varlock run` from the owning app directory, loading the auth instance from `src/services.ts`. Review the schema changes, then use your ORM's migration workflow to apply them.

## 📦 Production Build & Deployment

### 1. Build the Release Bundle on PC

Do not compile or run `vite build` on the Pi 2 to avoid memory exhaustion.

```Bash
pnpm build
```

This generates:

- `apps/web/dist` — React PWA assets.
- `apps/server/dist/server.js` — Single-file Node.js server bundle (`better-sqlite3` and `onoff` marked as external).
- `apps/server/drizzle` — SQL migration files.

### 2. Package Release

```Bash
bash scripts/build-release.sh
```

Outputs `build/v1.0.0.tar.gz` ready for deployment or R2 upload.

## Raspberry Pi 2 Setup & Systemd Service

Folder Structure on Pi

```Plaintext
/home/pi/gpio-app/
├── gpio_data.db                 # Persistent SQLite Database
├── current_version              # Installed version tag (e.g. 1.0.0)
├── current -> releases/v1.0.0/  # Active symlink
└── releases/
    └── v1.0.0/
        ├── server.js
        ├── drizzle/
        └── dist/
```

Systemd Service Configuration
Create `/etc/systemd/system/gpio-app.service`:

```Ini, TOML
[Unit]
Description=Elevator App - Hono GPIO PWA Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/home/pi/gpio-app/current
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3
MemoryMax=100M

[Install]
WantedBy=multi-user.target
```

Enable and start:

```Bash
sudo systemctl daemon-reload
sudo systemctl enable --now gpio-app.service
```
