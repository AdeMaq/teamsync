# TeamSync

Remote team workspace SaaS. A company signs up, creates a workspace, invites its people, and organizes projects, tracks tasks on a Kanban board, chats in real time, and follows progress on a dashboard. It is built to mirror how a real product (Jira / Trello / Slack) is engineered: clean architecture, secure auth, sensible API design.

> **Status: early development.** The database layer, authentication (register, login, session refresh, logout) and the Login/Register UI are in place. Workspaces, projects, tasks, chat and the rest are not built yet. See [Project status](#project-status).

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), Redux Toolkit / RTK Query, Tailwind CSS, Socket.IO client |
| Backend | Node.js, Express, MongoDB + Mongoose, Socket.IO, JWT, Joi, Multer, Winston |
| Tooling | Jest + Supertest, migrate-mongo, Docker |

## Core modules

Authentication, Workspaces, Projects, Tasks (Kanban), Comments, Messaging (real time), Notifications, Dashboard.

## Repository layout

```
teamsync/
├── client/             React app (Vite)
├── server/             Express API
│   ├── src/            application code
│   ├── docker-compose.yml   local MongoDB
│   └── migrate-mongo-config.cjs
├── ARCHITECTURE.md    architecture rules, decisions and change log
└── README.md
```

The architecture (modular monolith, feature-based, strictly layered) and the rules every change must follow are documented in [ARCHITECTURE.md](ARCHITECTURE.md).

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer, and npm
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (runs MongoDB locally)
- [MongoDB Compass](https://www.mongodb.com/products/tools/compass) (optional, to browse the database)
- Git

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/AdeMaq/teamsync.git
cd teamsync

cd server && npm install
cd ../client && npm install
```

### 2. Configure environment variables

```bash
# from server/
cp .env.example .env

# from client/
cp .env.example .env
```

Edit `server/.env` and replace the two placeholder secrets with long random strings:

```
JWT_ACCESS_SECRET=<long random string>
JWT_REFRESH_SECRET=<a different long random string>
```

You can generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

| Variable | Default | Purpose |
|---|---|---|
| `NODE_ENV` | `development` | Environment |
| `PORT` | `5000` | API port |
| `MONGO_URI` | `mongodb://localhost:27017/teamsync` | Database connection. **Must end with the database name.** |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | none, required | Token signing secrets |
| `JWT_ACCESS_EXPIRY` / `JWT_REFRESH_EXPIRY` | `15m` / `7d` | Token lifetimes |
| `CLIENT_URL` | `http://localhost:5173` | Allowed CORS origin |

`.env` files are git-ignored. Never commit real secrets.

### 3. Start MongoDB

Start Docker Desktop and wait until it reports the engine is running, then from `server/`:

```bash
docker compose up -d
docker ps          # teamsync-mongo should be listed as Up
```

Data is kept in the `mongo-data` Docker volume and survives restarts.

### 4. Run the database migrations

Migrations create the collections and their indexes. From `server/`:

```bash
npm run migrate:status   # lists migrations; all PENDING on a fresh database
npm run migrate:up       # applies them
```

Afterwards the `teamsync` database should contain 9 collections: `changelog`, `comments`, `messages`, `notifications`, `projects`, `refreshtokens`, `tasks`, `users`, `workspaces`.

### 5. Verify the database (MongoDB Compass)

1. Open Compass, click **Add new connection**.
2. Connect to `mongodb://localhost:27017`.
3. Click refresh and expand **teamsync**. Open a collection's **Indexes** tab to see its indexes, and the `changelog` collection to see applied migrations.

### 6. Run the apps

```bash
# from server/
npm run dev      # API on http://localhost:5000

# from client/
npm run dev      # app on http://localhost:5173
```

Open http://localhost:5173, register an account, and you land on a placeholder page that confirms you are logged in. The new user appears in the `users` collection in Compass.

## Useful commands

| Where | Command | What it does |
|---|---|---|
| `server/` | `npm run dev` | API with auto-reload (nodemon) |
| `server/` | `npm start` | API without reload |
| `server/` | `npm run migrate:create <name>` | Create a new migration file |
| `server/` | `npm run migrate:up` / `migrate:down` / `migrate:status` | Apply / revert / list migrations |
| `server/` | `docker compose up -d` / `docker compose stop` | Start / stop MongoDB, keeping data |
| `server/` | `docker compose down -v` | Stop MongoDB and **delete all data** |
| `client/` | `npm run dev` / `build` / `preview` / `lint` | Vite dev server / build / preview / lint |

## Migrations

Indexes are defined in migrations, **not** in the Mongoose schemas, so there is one source of truth. Migration files live in `server/src/database/migrations/` and use explicit index names. `down` only drops indexes and never drops collections or data. Shared migration helpers are in `server/src/database/helpers.cjs`.

## Project status

| Area | State |
|---|---|
| Architecture and folder structure | Done |
| Mongoose models (8) | Done |
| Index migrations (8) | Done and applied to the local database |
| Env validation, DB connection, logger | Done |
| Login / Register UI | Done, wired to the API |
| Express app, error handling, validation, root router | Done |
| Auth (register, login, refresh rotation, logout, me) | Done (forgot/reset password and email verification not yet) |
| Workspaces, projects, tasks, comments | Not started |
| Real-time messaging, notifications, dashboard | Not started |
| Tests, CI, Dockerfiles for the apps | Not started |

Next up: workspaces (create, list, invite, roles) and the RBAC middleware.

## Troubleshooting

- **Server exits with `MongoDB connection failed`:** Docker Desktop is not running or the `teamsync-mongo` container is stopped. Start it, then retry.
- **Logged out on every reload:** the browser must accept the `refreshToken` cookie. Use `http://localhost:5173` (not another host) and check `CLIENT_URL` in `server/.env`.
- **Migrations cannot connect:** Docker Desktop must be running and `docker ps` must list `teamsync-mongo`. Check `MONGO_URI` in `server/.env`.
- **Migrations ran but Compass shows no `teamsync` database:** make sure `MONGO_URI` ends with `/teamsync`, then refresh Compass.
- **Docker Desktop's Containers tab looks empty** but `docker ps` shows the container: restart Docker Desktop. It is a display problem and does not affect the database.
