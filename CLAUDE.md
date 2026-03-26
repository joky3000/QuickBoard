# QuickBoard

## Project Overview

QuickBoard is a Jira dashboard that aggregates tasks from multiple projects and sprints into a single unified view. Users connect via Jira Cloud's REST API using their own credentials, which are stored only in the browser's local storage — no backend, no server-side storage.

**Two views:** list (table) and kanban board, switchable from the dashboard.

### Pages

| Page | Route | Status |
|------|-------|--------|
| Login | `/login` | Not started |
| Dashboard | `/dashboard` | Not started |

### Login Page
Form fields: **email**, **API token**, **base URL** (e.g. `https://yoursite.atlassian.net`).
On save, credentials are stored in `localStorage` and the user is redirected to the dashboard.
On revisit, if credentials exist in `localStorage`, skip login and go straight to the dashboard.

### Dashboard Page
- Header: "QuickBoard" + Logout button (clears `localStorage`, redirects to login)
- Filter bar: Sprint, Priority (P1), Status filters + Switch button (list ↔ kanban)
- Main view: unified table/kanban of Jira issues pulled from multiple projects and sprints

## Jira Integration

**API:** Jira Cloud REST API v3
**Base URL pattern:** `https://{yoursite}.atlassian.net`
**Auth:** HTTP Basic Auth — `email:apiToken` base64-encoded in the `Authorization` header
**Key endpoints:**
- `GET /rest/api/3/myself` — validate credentials
- `GET /rest/api/3/project` — list all projects
- `GET /rest/agile/1.0/board` — list boards
- `GET /rest/agile/1.0/board/{id}/sprint` — list sprints for a board
- `GET /rest/agile/1.0/sprint/{id}/issue` — fetch issues in a sprint

**Security:** API token never leaves the browser. All Jira API calls are made client-side directly to the Jira Cloud instance.

## Tech Stack

- **Framework:** Angular 21 (standalone API, signals)
- **Language:** TypeScript 5.9 (strict mode)
- **Styling:** Tailwind CSS 4 via PostCSS
- **Server:** Express 5 for SSR
- **Testing:** Vitest 4
- **Build:** Angular CLI 21 with Vite

## Development Commands

```bash
npm start                      # Dev server at http://localhost:4200
npm run build                  # Production build to dist/
npm test                       # Run unit tests with Vitest
npm run serve:ssr:QuickBoard   # Run SSR production server (port 4000)
npm run watch                  # Watch mode (dev config)
```

## Project Structure

```
src/
├── app/
│   ├── app.ts               # Root component
│   ├── app.html             # Root template
│   ├── app.css              # Root styles
│   ├── app.config.ts        # Client-side providers
│   ├── app.config.server.ts # Server-side providers
│   ├── app.routes.ts        # Route definitions (currently empty)
│   └── app.routes.server.ts # Server routes
├── main.ts                  # Browser bootstrap
├── main.server.ts           # Server bootstrap
├── server.ts                # Express server
├── styles.css               # Global styles (imports Tailwind)
└── index.html               # HTML entry point
```

## Architecture

- **Standalone components** — no NgModules
- **Signals** for reactive state
- **SSR + client hydration** with event replay (`withEventReplay()`)
- **Server routes** via `app.routes.server.ts`

## Code Style

- Prettier: 100-char line width, single quotes, Angular HTML parser
- EditorConfig: 2-space indent, LF line endings, trim trailing whitespace
- TypeScript: strict, `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`

## Testing

Tests live alongside source files as `*.spec.ts`. Uses Angular `TestBed` with Vitest globals. Run with `npm test`.

## Build Budgets

- Initial bundle: warn at 500KB, error at 1MB
- Component styles: warn at 2KB, error at 4KB
