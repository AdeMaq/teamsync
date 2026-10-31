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

### 2026-10-10 - Auth: register / login / refresh / logout / me (server + client)
- **Server:** `app.js` (helmet, cors with credentials, json, cookie-parser, morgan -> winston, `/health`, `/api/v1`, 404 + error handler). Core: `HTTP` codes, `ERROR_CODES`, `ApiError`, `sendSuccess`, `asyncHandler`, token utils, `validate` / `requireAuth` / `authLimiter` / error middleware.
- **Endpoints:** `POST /api/v1/auth/register | login | refresh | logout`, `GET /api/v1/users/me`.
- **Tokens:** access JWT (15m) returned in the body and kept in memory on the client. Refresh JWT (7d, signed with `JWT_REFRESH_SECRET`, random `jwtid`) travels only in an `httpOnly` cookie (`refreshToken`, path `/api/v1/auth`, `sameSite=lax`, `secure` in production). Only a SHA-256 hash of the refresh token is stored.
- **Rotation + reuse detection:** each refresh revokes the old token and issues a new one in the same `family`. Presenting a revoked token revokes the whole family.
- **Login hardening:** one generic `INVALID_CREDENTIALS` error for unknown email and wrong password, with a dummy bcrypt compare so timing matches. bcrypt cost 12; password max 72 (bcrypt limit). `authLimiter` on register/login/refresh.
- **Module boundary example:** `auth` reaches users only via `modules/users/index.js` (`usersService`).
- **Client:** RTK Query is the only HTTP layer (`shared/api/baseApi.js`, `baseQuery.js` with single-flight silent refresh on 401). `features/auth` holds slice, `authApi`, `useBootstrapAuth`, `LoginForm`, `RegisterForm`. `ProtectedRoute` / `GuestRoute` guard routes. `LoginPage` / `RegisterPage` are now thin; the original markup moved into the forms unchanged.
- **Documented exception:** `shared/api/baseQuery.js` imports `features/auth/slice` directly (not `index.js`) to avoid an import cycle; auth state is core infrastructure.
- **Removed:** empty `shared/api/axiosInstance.js` (RTK Query's `fetchBaseQuery` replaces it). Client `VITE_API_BASE_URL` now `.../api/v1`.
- `pages/WorkspacePage.jsx` is a **placeholder** (greeting + logout) until the workspaces step.
- **Not yet verified:** server code is syntax-checked only (Docker was down, no live run); client not built (`node_modules` not installed).
- **Known limitation:** two browser tabs refreshing at the exact same moment can trip reuse detection and log the user out. Single-tab races are prevented by the single-flight refresh.
- **Not done:** forgot/reset password, email verification, tests.

### 2026-10-11 - Landing page, app shell and dashboard (client only)
- **Routes:** `/` public landing page. `/login`, `/register` behind `GuestRoute`. `/dashboard`, `/projects`, `/messages`, `/team`, `/settings` behind `ProtectedRoute` and rendered inside `AppShell`. Unknown paths redirect to `/`.
- **Redirect flow:** landing buttons link straight to protected routes (`Open workspace`, `Explore the demo` -> `/dashboard`; `See a Kanban board` -> `/projects`; `Get started free` -> `/register`). Logged out: `ProtectedRoute` sends the visitor to `/login` with `state.from`, and after login `GuestRoute` returns them there. Logged in: they land directly on the target. With no `from`, the default destination is `/dashboard`.
- **Landing:** `features/landing` (`LandingNavbar`, `Hero`, `KanbanMockup`, `Features`, `CtaBanner`, `LandingFooter`), composed by `pages/HomePage.jsx`. Space Grotesk (`font-display`) and DM Sans (`font-landing`) are used on the landing page only; the app keeps Inter. New Tailwind tokens: `bg-hero-glow`, `bg-cta-glow`.
- **App shell:** `shared/layout/AppShell` (fixed `Sidebar`, sticky `Navbar`, mobile slide-out menu). Nav links and top-bar titles come from one list in `shared/layout/navItems.jsx`. Sidebar is 256px (`w-64`), fixed from 768px up and a slide-out drawer below that (superseded the first guide's 380px, which was too wide).
- **Dashboard theme:** the app keeps ONE colour scheme: navy `#070B14`, slate card `#131A2B`, border `#232B45`, muted `#8B95A7`, teal `#2DD4BF`, gradient `#2DD4BF -> #3B82F6`. The dashboard reads it through `dash.*` tokens in `tailwind.config.js` (aliases with the same values), plus `bg-dash-gradient` / `bg-dash-bar`. The second design spec's different hex palette was tried and reverted because it broke consistency with login and landing; only its sizes, spacing and fonts (DM Sans `font-body`, Space Grotesk `font-display`) were kept. To retheme, change the values in one place. Sizes follow the spec: 12/14/16/18/20/30px type, 36px nav items and inputs, 20px card padding, 16px gaps. Breakpoints: stats 4 across at 1280px+, 2x2 from 768px, one column below; the 2/3 + 1/3 rows hold from 768px.
- **Dashboard:** `features/dashboard` components (`StatsCard`, `ActivityChart`, `ActivityFeed`, `ProjectHealth`, `Workload`) rendered by `pages/DashboardPage.jsx`.
- **Shared UI added:** `Card`, `Avatar`, `Logo`, `icons.jsx` (inline SVG, no icon package).
- **STATIC SAMPLE DATA:** the dashboard numbers live in `features/dashboard/mockData.js`; the workspace card in `Sidebar.jsx`; the "4" notification badge and search box in `Navbar.jsx`; the sprint subtitle in `navItems.jsx`. Replace with API data as those modules are built. The sidebar user card shows the real logged-in name and email.
- `projects`, `messages`, `team`, `settings` use `PlaceholderPage` until built. Removed the earlier `WorkspacePage` placeholder.
- **Verified:** `vite build` succeeds and `oxlint` reports no errors (only empty-scaffold-file warnings), run on a copy in a scratch folder. **Not verified visually in a browser.**

### 2026-10-13 - Profile page: avatar, email, log out, delete account
- **Entry point:** the sidebar user card is a link to `/profile` (inside `AppShell`). The card's small logout icon was removed; logging out now lives on the profile page.
- **Endpoints (all need `requireAuth`):** `PATCH /api/v1/users/me/email`, `POST /api/v1/users/me/avatar` (multipart field `avatar`), `DELETE /api/v1/users/me/avatar`, `DELETE /api/v1/users/me`. Email change and account deletion require the current password and share `authLimiter`.
- **Wrong password = `403 INVALID_PASSWORD`, never 401.** The client treats a 401 on a normal request as "access token expired" and silently refreshes; a 401 here would trigger that by mistake.
- **Avatars:** stored on local disk in `server/uploads/avatars/<userId>-<random>.<ext>` (gitignored); `user.avatar` holds the relative URL `/uploads/avatars/...`. Limits: JPEG/PNG/WebP, 2 MB. The extension comes from the verified mime type, and the file's magic bytes are checked after upload (a faked mime type is rejected). Replacing or removing deletes the old file; deletion only touches files inside the avatars folder. Served by `express.static` at `/uploads` with `Cross-Origin-Resource-Policy: cross-origin` (helmet's default would block the React app from showing them). Client builds the URL with `shared/utils/assetUrl.js`.
- **Delete account:** users service verifies the password, removes the avatar file, emits `USER_DELETED` on `events/eventBus.js`, then deletes the user. `auth.events.js` listens and deletes the user's refresh tokens. **Every future module that owns user data (workspaces, tasks, comments, messages, notifications) must listen for `USER_DELETED` too.** The auth module did not need to import users code for this, which keeps module boundaries intact.
- **Email change:** `isEmailVerified` is not reset yet because email verification is not built.
- **Shared:** `core/validation/fields.js` (`emailField`), `config/paths.js`, `ActionButton`, `TextField`, `Avatar` now accepts `src`. The client `auth` slice gained `userUpdated`.
- **Verified:** server endpoints were exercised live against the local database with a throwaway account (wrong/same/new email, fake image, wrong mime type, no auth, upload/replace/remove avatar, static serving headers, wrong/right password delete, tokens and files cleaned up). Client builds and lints clean on a scratch copy. **Not looked at in a browser.**
- **Not done:** change name, change password (both are in the original API plan), tests.

### 2026-10-17 - Account security: change name / password, forgot + reset password, automated tests
- **Endpoints:** `PATCH /users/me` (name), `PATCH /users/me/password`, `POST /auth/forgot-password`, `POST /auth/reset-password`.
- **Change password:** needs the current password (wrong = `403 INVALID_PASSWORD`, field `currentPassword`); new password must differ and be 8-72 chars. It emits `PASSWORD_CHANGED`; auth listens and deletes all refresh tokens, so the account is signed out everywhere. The client then clears its local session and shows the login page with a notice.
- **Forgot / reset:** the token is 32 random bytes (hex) emailed as `CLIENT_URL/reset-password/<token>`; only its SHA-256 hash is stored on the user (`passwordResetTokenHash`, `passwordResetExpiresAt`, both `select: false` and stripped from JSON), valid 1 hour, single use, and a newer request replaces the older token. `forgot-password` always answers the same way and does not await the email, so it cannot be used to discover which emails are registered. A successful reset deletes all refresh tokens. Both routes use `authLimiter`.
- **Email sending:** `core/utils/sendEmail.js` (nodemailer). Optional `SMTP_HOST/PORT/USER/PASS`, `EMAIL_FROM` in `server/.env`. With no `SMTP_HOST`, development prints the message (and reset link) in the server console; production logs a warning and sends nothing. Outside production the last 20 messages are kept in `outbox` (tests read reset links from it).
- **Migration added:** `20261017100001-add-user-password-reset-index` (sparse index on `passwordResetTokenHash`). Run `npm run migrate:up` against the development database.
- **Shared:** `core/utils/password.js` (`hashPassword`, `verifyPassword`, `DUMMY_HASH`; bcrypt cost 12, cost 4 only when `NODE_ENV=test`), `core/validation/fields.js` now also holds `nameField` and `passwordField`.
- **Client:** profile page gained `NameSection` and `PasswordSection`; new public routes `/forgot-password` and `/reset-password/:token` (`ForgotPasswordForm`, `ResetPasswordForm`); `LoginForm` shows a notice passed in route state.
- **Tests (`npm test` in `server/`):** Jest + Supertest, 82 tests in 4 files (`tests/unit/security.test.js`, `tests/integration/auth|profile|passwordReset.test.js`). They run against a separate database `teamsync_test` on the same local MongoDB (override with `MONGO_URI_TEST`); the helpers refuse to run on any database whose name does not end in `_test`. Real migrations are applied first so indexes match development; every collection is cleared after each test and the database is dropped at the end. The logger is silent in tests and JWT secrets are fixed test values. Avatar tests write to `server/uploads/avatars` and remove their files afterwards. Needs the Docker MongoDB running.
- **Known gaps:** no client-side tests yet; `isEmailVerified` is still never set to true (email verification is not built); the dev database needs the new migration applied.

### 2026-10-18 - Workspaces module (backend) and role-based access control
- **Endpoints (`/api/v1/workspaces`, all need a login):** `POST /` create, `GET /` list mine, `GET /:id` details with members, `PATCH /:id` name/description, `DELETE /:id` (owner types the workspace name in `confirmName`), `POST /:id/invite`, `GET /:id/invites`, `DELETE /:id/invites/:inviteId`, `POST /invites/accept`, `PATCH /:id/members/:memberId` (role), `DELETE /:id/members/:memberId` (remove, or leave when it is yourself), `POST /:id/transfer-ownership`.
- **Roles and the policy map:** `core/constants/roles.js` (owner 3 > admin 2 > member 1) and `core/constants/permissions.js` (`PERMISSIONS` maps each action to the lowest role allowed; `can(role, action)` throws on an unknown action so a typo can never grant access). Routes name an action, never a role.
- **RBAC middleware:** `requireWorkspacePermission(action, param = 'id')` in `modules/workspaces/workspaces.middleware.js`, exported from `workspaces/index.js`. It loads the workspace from the URL, checks membership and the role's permission, and sets `req.workspace` / `req.membership`. **Projects, tasks, messages... must use it** on their routes (pass the URL parameter holding the workspace id). It lives in the workspaces module, not in `core/`, because it needs workspace data; the empty `core/middleware/rbac.middleware.js` scaffold was removed.
- **Tenant isolation:** non-members get the same 404 as a workspace that does not exist, so ids cannot be probed.
- **Rank rule for people:** you may only act on people ranked below you and only hand out roles below your own. So admins can invite/remove plain members but cannot promote anyone to admin, touch other admins or the owner; only the owner promotes/demotes admins. The owner can neither be removed nor leave: transfer ownership first (the old owner becomes admin) or delete the workspace.
- **Invitations:** 32 random bytes emailed as `CLIENT_URL/invites/<token>`, only the SHA-256 hash is stored in `workspace.invites`, valid 7 days, max 50 pending, a new invite to the same email replaces the old one. Accepting needs a login with the **same email the invite was sent to**, and is atomic (no double join). Responses never contain the token or its hash.
- **Slugs:** generated from the name (accent-stripped, unique with a random suffix on collision) or supplied by the creator; **never changed afterwards** so URLs stay valid. Duplicate-key races now map to `SLUG_TAKEN` / `EMAIL_TAKEN` / `CONFLICT` by the field that clashed.
- **Account deletion (event `USER_DELETED`):** a workspace owned by the deleted user passes to the most senior remaining member (highest role, then earliest joined); a workspace with nobody else is deleted; memberships and invitations they sent are removed.
- **New event `WORKSPACE_DELETED`:** **projects, tasks, comments and messages must listen for it and delete their own data** when those modules are built.
- **Migration added:** `20261018100001-add-workspace-invite-index` (sparse index on `invites.tokenHash`). Run `npm run migrate:up` on the development database.
- **Tests:** 71 new (153 total). `tests/unit/access.test.js` (permission table, slugify) and `tests/integration/workspaces.test.js` (create/list/get, update, delete, invitations incl. wrong-email and expiry, role changes, remove/leave, ownership transfer, account-deletion hand-over). A mutation check (weakening one permission) made the suite fail as expected.
- **Not done:** the client (workspace switcher, create-workspace screen, members/invites screens, accepting an invite from the emailed link), workspace logo upload, plan limits, notifications for invites (the notifications module does not exist yet).

### 2026-10-22 - Workspaces on the client: onboarding, switcher, team, settings, invitations
- **Routes:** `/team` (members + invitations), `/settings` (workspace details + danger zone), `/workspaces/new`, and `/invites/:token` (logged-in only; logged-out visitors are sent to log in and brought back, and the login/register links now carry that "where you were headed" state so an invitee can sign up first). Pages that need a workspace sit under `WorkspaceGate`; profile, new-workspace and the invite page do not.
- **Active workspace:** `features/workspaces` holds `activeWorkspaceId` (remembered in `localStorage`, per-viewer convenience, wrapped in try/catch). `useActiveWorkspace()` returns `{ workspaces, active, isLoading }`: the saved choice if still valid, otherwise the first workspace. **Projects, tasks, chat... read the current workspace through this hook** and send its `_id` to the API.
- **`WorkspaceGate`:** spinner while loading, a retry card on error, and "Create your first workspace" when the user belongs to none (this is the registration -> first workspace step). Joining via an invitation or creating one makes it the active workspace.
- **`WorkspaceSwitcher`** replaces the placeholder card in the sidebar (dropdown with the user's workspaces, check on the active one, "Create workspace" link, closes on outside click / Escape).
- **Permissions on the client:** `features/workspaces/permissions.js` is a copy of the server's rank rules (`can`, `assignableRoles`, `canManageMember`), used **only to decide which buttons to show**. The server enforces everything again. **Change both together when a rule changes.**
- **Team page:** invite form (admin+; role choices limited to roles below your own), members list (role select only where the rank rule allows, two-step "Remove"), pending invitations with revoke (admin+). Plain members see the list read-only.
- **Settings page:** edit name/description (admin+; read-only for members; the URL name stays fixed). Danger zone: owner can transfer ownership or delete (must type the exact name); everyone else can leave.
- **Cache:** RTK Query tags `Workspaces`, `Workspace(id)`, `Invites(id)`; deleting/leaving only refreshes the list (refetching a workspace you can no longer see would 404).
- **Shared UI added:** `SelectField`, `TextAreaField`, `Spinner`, `ChevronDown/Plus/Check` icons, `formatDate`.
- **Verified:** client builds and lints clean. The real app (routes, guards, store, API layer) was exercised with 14 UI tests against an in-memory fake API on a scratch copy (onboarding, switcher, role-dependent team/settings screens, invitations, delete confirmation); a mutation check on the permission helper made them fail as expected. **Not tried in a real browser, and not run against the real backend.** Those UI tests are NOT in the repository: the client has no test tooling yet (vitest + Testing Library would be added as dev dependencies).
- **Still static:** the dashboard numbers, activity and workload (they need projects/tasks); the notification badge; `Projects` and `Messages` are placeholders.

### 2026-10-25 - Workspace logo upload and plan member limits
- **Logo:** `POST /workspaces/:id/logo` (multipart field `logo`) and `DELETE /workspaces/:id/logo`, admin and owner only (`workspace:update`). JPEG/PNG/WebP up to 2 MB, extension from the verified mime type, real file signature checked after upload. Stored in `server/uploads/logos/<workspaceId>-<random>.<ext>` (gitignored), `workspace.logo` holds the relative URL. Replacing or removing deletes the old file; the file is also deleted when the workspace is deleted or removed because its last member's account was deleted (not when ownership just passes on).
- **The permission check runs BEFORE the upload middleware in the route**, so someone who may not change the logo can never write a file. A test guards this order (swapping it makes 2 tests fail).
- **Shared upload code:** `core/middleware/upload.middleware.js` now builds both `uploadAvatar` and `uploadLogo` from one factory; `core/utils/imageFile.js` holds `looksLikeImage` and `removeUpload` (used by users and workspaces); `config/paths.js` gained `logosDir` / `LOGO_URL_PREFIX`.
- **Plan limits:** `core/constants/plans.js` is the single place: free 10 members, pro 100, enterprise unlimited (`null`); an unknown plan is treated as free, never unlimited. **These numbers are defaults chosen by the developer, not a product decision: change them there.** The limit counts people already in the workspace PLUS pending invitations. Inviting beyond it, or accepting an invitation when full, gives `403 PLAN_LIMIT_REACHED`; the invitation stays valid and works once a seat is free. Re-inviting an email that already has a pending invitation replaces it and is allowed when full. The accept update itself is atomic and refuses to overfill (`$expr` on the member count), so two simultaneous accepts cannot exceed the limit. Workspace summaries now include `memberLimit` (`null` = unlimited).
- **There is no billing:** every workspace is still created on `free`; the plan can only be changed in the database for now.
- **Client:** `WorkspaceLogo` (picture, or the first letter on the brand gradient) in the sidebar switcher and its dropdown; `LogoSection` on the settings page for admins and the owner; the team page shows "(3 of 10)" and the settings details show the plan with its limit; `validateImageFile` is shared with the profile photo upload.
- **Tests:** server 183 (30 new: `workspaceLogo`, `planLimits`, `plans` unit). Client: 11 UI tests on a fake API in a scratch copy (not in the repo, see the previous entry), including a mutation check.
- **Still not done:** invitation notifications (the notifications module does not exist yet; a `workspace.member_invited` event can be added when it does), and a real-browser pass.

### 2026-10-28 - Projects module (backend)
- **Endpoints:** `POST /api/v1/workspaces/:workspaceId/projects` (create), `GET /api/v1/workspaces/:workspaceId/projects` (list), `GET|PATCH|DELETE /api/v1/projects/:id`.
- **Who can do what (defaults chosen by the developer, change them in `permissions.js` / `projects.service.js`):** every workspace member can see all projects of the workspace and create one, and becomes its **lead**. Editing or deleting needs the project's lead **or** a workspace admin/owner. Private projects with their own member lists are NOT built (the model's `contributor`/`viewer` roles are unused for now).
- **Permissions:** `core/constants/permissions.js` gained `project:view`, `project:create` (member) and `project:manage` (admin: the workspace-wide override). The extra "or the lead" rule lives in `projects.service.js` (`canOnProject`).
- **Two guards:** workspace-scoped routes reuse `requireWorkspacePermission(action, 'workspaceId')`. Routes that name only a project use the new `requireProjectPermission(action)` (projects module): it loads the project, looks up the caller's role in the project's workspace through `workspaces/index.js` (`getMembership`), and answers non-members with the same 404 as a missing project. **Tasks, comments... must use `requireProjectPermission` on their `/projects/:id/...` routes.**
- **List:** always limited to one workspace; filters `status`, `q` (name search, case-insensitive, matched literally via `escapeRegex`), `sort` (`updated` default, `name`, `created`, with `_id` as tie-breaker), paging `page` (>=1) and `limit` (1-100, default 20); response `{ projects, total, page, limit }`. Query values are validated into `req.valid.query` (Express 5 keeps `req.query` read-only).
- **Response shape:** each project has `lead` (name/email/avatar, or `null` when nobody leads it), `createdBy` (id only), `canManage` (computed for the caller, to show or hide buttons; the server still checks) and the usual fields.
- **Dates:** an end date before the start date is rejected (400, field `endDate`), also when only one of them is updated; `null` clears a date.
- **Lead:** `PATCH` with `leadId` hands the project over (the new lead must be a workspace member); an atomic pipeline update keeps exactly one lead.
- **Events (new in `events/eventNames.js`):** `WORKSPACE_MEMBER_REMOVED` (emitted by workspaces when someone is removed or leaves) and `PROJECT_DELETED` (emitted before a project is deleted; **tasks and comments must listen and delete their own data**). Projects listens for `WORKSPACE_DELETED` (deletes the workspace's projects), `USER_DELETED` and `WORKSPACE_MEMBER_REMOVED` (the person stops being a lead; the project stays and admins can still manage it and name a new lead).
- **Migration added:** `20261028100001-add-project-indexes` (`workspace + updatedAt desc`, `members.user`). Run `npm run migrate:up` on the development database.
- **Rate limiter:** `authLimiter` is now `{ production: 20, development: 200, test: 100000 }` (an unknown environment name gets the strict limit); the test suite creates hundreds of accounts from one address.
- **Tests:** 46 new (229 total): `tests/integration/projects.test.js` (create, list incl. filters/search/paging/tenant isolation, get, update incl. dates and lead hand-over, delete, event clean-ups) and project rows in the permission-table unit test. Two mutation checks (everyone can manage; list ignores the workspace) made the suite fail as expected.
- **Not done:** the client (Projects page, project form, project page), task counts per project (needs the tasks module), project-level members.

### 2026-10-31 - Projects screens (client)
- **Routes:** `/projects` (list), `/projects/new` (create), `/projects/:projectId` (details). All sit inside `WorkspaceGate`, so a workspace always exists. `ROUTES.project` is a pattern; `projectPath(id)` builds the link.
- **Feature folder `client/src/features/projects`:** `api/projectApi.js` (RTK Query), `components/` (`ProjectsList`, `ProjectCard`, `ProjectForm`, `DeleteProject`, `StatusBadge`), `constants.js` (statuses, sorts, colours; the statuses must match `PROJECT_STATUSES` on the server), `utils.js` (paths and date formatting), `index.js` (the public API). Pages: `ProjectsPage`, `NewProjectPage`, `ProjectPage`.
- **Cache tags:** `Projects` (one list per workspace, `id` = workspace id) and `Project` (one project). Create and edit refresh the workspace's list; edit also refreshes the project; delete refreshes only the list, because refetching the deleted project would return 404.
- **List:** search (debounced 300 ms by the new `shared/hooks/useDebounce`), status filter and sort are sent to the server; 12 per page with Previous/Next. A filter change returns to page 1; if the last page empties, the list steps back one page. Search is labelled "Search projects" because the top bar already has a "Search" box.
- **Permissions in the UI:** the Edit and Delete sections show only when the server's `canManage` flag is true; the server checks every request again. `permissions.js` on the client needed no change.
- **Form:** one `ProjectForm` for create and edit. Edit mode adds the lead hand-over (members come from the workspace query), and "Save changes" stays disabled until something changed. Empty dates are sent as `null`. Project dates are calendar days and are shown in UTC so a time zone cannot shift them.
- **Tests:** the repo still has no client test setup. The 15 new screen tests (list, filters, paging, tenant isolation, create, validation, edit, lead hand-over, read-only member, lead-as-member, delete with confirmation, not found) ran in a scratch copy of the client on a fake in-memory API, together with the 11 earlier workspace tests: 26 pass. Three weakened behaviours (always show Edit, always enable Save, ignore the page number) each failed tests as expected.
- **Not done:** task counts and progress on the cards (need the tasks module), the Tasks section on the project page (placeholder), a real-browser pass.

### Known issues carried over
- Client has both `tailwindcss@3` and `@tailwindcss/vite@4` installed; only v3 is used.
- `/forgot-password` link on LoginPage has no route yet.
