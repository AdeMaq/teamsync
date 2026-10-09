# TeamSync — Architecture & Engineering Standards

Living document. Everything we decide about how TeamSync is built is recorded here.
Update it in the same change as the code it describes.

---

## 1. Architectural style

**Modular monolith, feature-based, strictly layered.**

- One deployable Node API. No microservices (network/DevOps cost with no benefit at this scale).
- Code is grouped by **feature** (auth, tasks, ...), not by type.
- Each module owns its data and exposes a small public interface, so a module (e.g. chat) can be extracted into a service later.

## 2. Backend layout (`server/src`)

```
app.js              builds the Express app (no listen)
server.js           http server + socket bootstrap, graceful shutdown
config/             env (Joi-validated), db, logger
core/               cross-cutting code, NO business logic
  constants/        http status codes, roles, permissions map
  errors/           ApiError, error codes
  middleware/       auth, rbac, validate, error, rateLimiter, upload
  utils/            apiResponse, asyncHandler, generateToken, sendEmail
events/             in-process event bus + event name constants
sockets/            Socket.IO bootstrap + gateways (chat, notifications)
routes/             root router, mounts every module under /api/v1
modules/<name>/     one folder per feature (see below)
database/migrations migrate-mongo migrations (currently empty)
tests/              unit/ and integration/
```

Module folder (`modules/tasks` as the example):

| File | Responsibility |
|---|---|
| `tasks.routes.js` | HTTP wiring + middleware only |
| `tasks.controller.js` | Translate req -> service call -> res. No business logic |
| `tasks.service.js` | Business rules. Never sees `req`/`res` |
| `tasks.repository.js` | The ONLY file that touches Mongoose |
| `tasks.model.js` | Mongoose schema (to be written) |
| `tasks.validation.js` | Request schemas |
| `tasks.events.js` | Events this module emits |
| `index.js` | **Public API** of the module |

Modules in scope: `auth`, `users`, `workspaces`, `projects`, `tasks`, `comments`, `messages`, `notifications`, `dashboard`.

## 3. Rules (must be followed)

1. **One-way dependencies:** routes -> controller -> service -> repository -> model. A layer never imports from a layer above it.
2. **Module boundaries:** a module imports another module only through that module's `index.js`. Never reach into another module's repository or model.
3. **Controllers are thin:** parse input, call one service method, shape output.
4. **Services are framework-free:** no `req`/`res`, so they are unit-testable.
5. **Side effects across modules go through the event bus**, not direct calls (e.g. `task.assigned` -> notifications listens). The emitting module does not know who listens.
6. **Tenant isolation:** every query on tenant data includes `workspaceId`, enforced in the repository layer.
7. **Errors:** throw `ApiError` with a stable machine-readable `code`; one global error handler formats everything.
8. **Response shape:** success `{ success: true, data }`; failure `{ success: false, error: { code, message, details } }`.
9. **Validate at the edge:** every request body/params/query is validated before reaching a controller.
10. **API is versioned:** `/api/v1/...`.

## 4. Key technical decisions

**Authentication**
- Access token ~15 min, sent as `Authorization: Bearer`, kept in memory on the client (not localStorage).
- Refresh token in an `httpOnly`, `secure`, `sameSite` cookie, ~7 days.
- **Rotating refresh tokens with reuse detection**: reuse of a revoked token revokes the whole token family. Store only a **hash** of the token in the DB.
- Passwords hashed with bcrypt.

**Authorization (RBAC)**
- Two scopes: workspace role (`owner | admin | member`) and project role (`lead | contributor | viewer`).
- A single policy map `can(user, action, resource)` in `core/constants/permissions.js`; no role checks scattered around.

**Data (MongoDB)**
- Reference by ObjectId for large/independent collections (tasks, messages, notifications, **comments**).
- Embed only small, bounded data (workspace members, task labels, capped attachments).
- Cursor-based pagination for messages and notifications.
- Indexes are defined in **migrations** (single source of truth) — do not also declare `index: true`/`unique: true` in schemas.
- Soft delete only where it matters (messages).

**Real-time (Socket.IO)**
- JWT verified in the handshake. Sockets join `workspace:{id}` and `user:{id}` rooms.
- Sockets mainly **push** state changes; writes go through the same validated service layer (REST; chat send may be a socket event calling the same service).
- Scale-out later = Redis adapter; nothing else changes.

**Cross-cutting**
- Structured logging (Winston) with request IDs, graceful shutdown, `/health` and `/ready`, OpenAPI docs.
- Security baseline: helmet, strict CORS, rate limit on auth routes, NoSQL-injection sanitizing, no secrets in the repo.

## 5. Frontend layout (`client/src`)

```
App.jsx, main.jsx
app/                store.js, rootReducer.js, routes/ (AppRoutes, routePaths), providers/ (ThemeContext)
shared/             api/ (axiosInstance, socketService), ui/, layout/, common/, hooks/, utils/
features/<name>/    api/ (RTK Query), components/, hooks/, slice.js, index.js (public exports)
pages/              thin route-level composition
```

Features: `auth`, `workspaces`, `projects`, `tasks`, `messaging`, `notifications`, `dashboard`.

Rules:
- **RTK Query owns all server data.** Slices hold only client state (current user, active workspace, UI state). Never duplicate server data in slices.
- The API client attaches the token and does a **single-flight silent refresh** on 401.
- Socket events update the RTK Query cache (`updateQueryData`), not a separate store.
- A feature is imported by other code only through its `index.js`.
- Route-level code splitting with `React.lazy`.
- Kanban moves use optimistic updates with rollback.

## 6. Quality & delivery

- Tests: unit tests on services (repositories mocked); integration tests with Supertest + `mongodb-memory-server`.
- CI: GitHub Actions running lint, test, build on every PR.
- Docker: multi-stage Dockerfile per app; compose for the full stack.

## 7. Open decisions (not yet answered)

| # | Decision | Current default |
|---|---|---|
| 1 | TypeScript vs JavaScript | **JavaScript** (existing code). Recommended: TypeScript. |
| 2 | Zod vs Joi | **Joi** (already installed). Recommended: Zod. |

## 8. Change log

### 2026-10-09 — Restructure to the architecture above
- **Removed:** all Mongoose models (`*.model.js`, incl. `refreshToken.model.js`) and all 6 index migrations. To be rewritten under the new rules (see section 4 for schema direction).
- **Server:** `common/*` -> `core/*`; `middlewares/` -> `core/middleware/`; deleted empty `config/socket.js` (replaced by `sockets/`); added `events/`, `sockets/`, `tests/`, `core/constants/permissions.js`, per-module `index.js`, `*.events.js`, and a new `comments` module.
- **Client:** `store/`, `routes/`, `context/` -> `app/`; `components/`, `services/`, `hooks/`, `utils/` -> `shared/`; each feature now has `api/`, `components/`, `hooks/`, `slice.js`, `index.js`. Import paths in `App.jsx`, `LoginPage`, `RegisterPage`, `AppRoutes` updated.
- **Kept as-is:** `config/env.js`, `config/db.js`, `config/logger.js`, `server.js`, `docker-compose.yml`, `migrate-mongo-config.cjs`, Login/Register UI.
- **Not verified:** client build not run (`node_modules` not installed).

### 2026-10-09 — Models created (8)
- Files: `users.model.js`, `auth/refreshToken.model.js`, `workspaces.model.js`, `projects.model.js`, `tasks.model.js`, `comments.model.js`, `messages.model.js`, `notifications.model.js` (each under `server/src/modules/<module>/`).
- Models are **schema only**: no `index`/`unique` options (migrations own indexes) and no business logic.
- User: field renamed `password` -> `passwordHash`; bcrypt hashing and `comparePassword` move to the auth service. `status` now defaults to `active` (was `invited`).
- RefreshToken: stores `tokenHash` (not the raw token) plus `family` and `replacedByTokenHash` for rotation and reuse detection.
- Workspace: added embedded `invites` (email, role, tokenHash, invitedBy, expiresAt) for the invite flow.
- Task: embedded `comments` removed (own `Comment` model); `attachments` kept embedded, capped in the service.
- Comment (new): `workspace`, `task`, `author`, `text`, `mentions`, `editedAt`, `deletedAt`.
- **Indexes still to write as migrations:** users.email unique; workspaces.slug unique + members.user; refreshtokens.tokenHash unique + user + family + TTL on expiresAt; projects workspace+status; tasks project+status+position and assignees; comments task+createdAt; messages workspace+channel+createdAt desc; notifications recipient+isRead+createdAt desc.

### 2026-10-09 — Index migrations written (8)
- `server/src/database/migrations/20261009100001..08-create-<collection>-indexes.cjs`, one per collection (users, refreshtokens, workspaces, projects, tasks, comments, messages, notifications). Each `up` creates the collection if missing, then its indexes, all with explicit names.
- `server/src/database/helpers.cjs` holds `ensureCollection` and `dropIndexes`. It sits outside `migrations/` because migrate-mongo treats every file in that folder as a migration.
- `down` only drops the named indexes; it never drops collections or data.
- Collection names are Mongoose's pluralised lowercase names (`RefreshToken` -> `refreshtokens`). A migration with the wrong name would index a different collection.
- Syntax-checked with `node --check`; **not yet run against a database**.

### Known issues carried over
- `server.js` imports `app.js`, which is still empty -> server cannot start yet.
- Client has both `tailwindcss@3` and `@tailwindcss/vite@4` installed; only v3 is used.
- `/forgot-password` link on LoginPage has no route yet.
