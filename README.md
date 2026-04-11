# 🌍 Programmers World


A unified platform for programmers to **learn**, **build**, **compete**, and **collaborate**. Built for students and early-career developers, scalable for professionals and companies.

## What's included (MVP)


- **User authentication** — Register, login, JWT
- 
- **Developer profiles** — Username, bio, skills, rank, projects, badges; optional **hosted portfolio URL** (your own static site on GitHub Pages, Vercel, etc.) linked from the profile
- 
- **Project playground** — Create projects, join with a role (frontend/backend/UI/UX/fullstack), browse and search
- **Community** — Sections (General, Debug help, Project feedback, etc.), posts, threaded comments, mark solution
- **Coding challenges** — Submit solutions (e.g. GitHub links); optional **submission close** time hides others’ entries until the deadline, then shows a **public timeline** in submission order. Challenges without a close time use a classic leaderboard.
- **Admin** — Seeded `isAdmin` users get `/admin`: create/delete challenges, delete community posts, delete non-admin users (API: `/api/admin/*`)

## Tech stack

| Layer      | Stack                |
|-----------|----------------------|
| Frontend  | Vite, React, React Router, Tailwind CSS |
| Backend   | Node.js, Express     |
| Database  | PostgreSQL + Prisma |
| Auth      | JWT, bcrypt          |

## Repository layout

### Client (`client/src/`)

| Path | Role |
|------|------|
| `app/` | App shell: `App.tsx` (routes), `providers.tsx` (AuthProvider and future global providers) |
| `pages/` | Route-level screens (one file per URL segment group) |
| `shared/api/` | `http.ts` (fetch wrapper) + domain modules (`auth`, `users`, `projects`, `messages`, `follow`, `challenges`, `admin`, `posts`) — import from `@/shared/api` |
| `shared/components/` | Shared UI: `Nav`, `AuthProvider`, `FollowCreatorActions` — import from `@/shared/components` |
| `main.tsx` | Vite entry: `BrowserRouter` → `AppProviders` → `App` |

Path alias: `@/*` → `src/*` (see `client/tsconfig.json`).

### Server (`server/src/`)

| Path | Role |
|------|------|
| `index.js` | Process entry: `createApp()`, then `listen` |
| `app.js` | `createApp()` — middleware, `/api/*` route mounting, 404 and error handler |
| `config/` | Port, CORS (`CLIENT_ORIGIN` or dynamic origin in dev) |
| `routes/` | Express routers per domain |
| `middleware/` | JWT auth helpers |
| `lib/` | Prisma client, GitHub helpers, DM thread helpers |

## Quick start

### Prerequisites

- Node.js 18+
- PostgreSQL (local or cloud)

### 1. Clone and install

```bash
cd Programrs_world
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### 2. Environment

Copy the root `.env.example` to `.env` and set:

- `DATABASE_URL` — PostgreSQL connection string (e.g. `postgresql://user:password@localhost:5432/programmers_world`)
- `JWT_SECRET` — A long random string for signing tokens
- `SERVER_PORT` — e.g. `4000`
For the **server**, create `server/.env` with at least:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/programmers_world"
JWT_SECRET=your-secret-key
SERVER_PORT=4000
```

The **client** (Vite) proxies `/api` to the backend by default (`http://localhost:4000`). To use a different API URL, set `VITE_API_BASE_URL` in `client/.env` (legacy `VITE_API_URL` also works), for example:

```env
VITE_API_BASE_URL=http://localhost:4000
```

### 3. Database

```bash
cd server
npx prisma generate
npx prisma db push
```

### 4. (Optional) Seed sample data

```bash
cd server
npx prisma db seed
```

This creates:

- **Demo:** `demo@programmers.world` / `demo1234`
- **Admin:** `admin@programmers.world` / `admin1234` (or set `ADMIN_SEED_PASSWORD` in `server/.env` before seeding; the seed resets the admin password on each run)

Admins (`isAdmin: true`) can **create** challenges (`POST /api/challenges`), use **`/admin`** in the app, and call **`/api/admin`** for overview, post/user lists, `DELETE` posts/users, and `DELETE` challenges. You cannot delete yourself or another admin via the API. User delete cascades (projects, posts, etc. per Prisma).

**Production:** change or remove these seeded accounts; do not rely on default passwords.

### 5. Run

**Terminal 1 — API**

```bash
cd server
npm run dev
```

**Terminal 2 — Frontend**

```bash
cd client
npm run dev
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:4000](http://localhost:4000)

**Important:** The Vite dev server proxies `/api/*` to the backend (`vite.config.ts`). Set `VITE_API_BASE_URL` (or legacy `VITE_API_URL`) if the API is not on the default port.

From the root you can also run both with:

```bash
npm run dev
```

(requires `concurrently` installed at root.)

## Project structure

```
Programrs_world/
├── client/                 # Vite + React frontend
│   ├── index.html
│   ├── src/
│   │   ├── App.tsx          # Routes
│   │   ├── main.tsx
│   │   ├── pages/           # Page components
│   │   ├── components/      # Nav, AuthProvider
│   │   └── lib/             # API client
│   └── package.json
├── server/                  # Express API
│   ├── prisma/
│   │   └── schema.prisma    # DB schema
│   ├── src/
│   │   ├── routes/          # auth, users, projects, challenges, posts
│   │   ├── middleware/     # auth (JWT)
│   │   └── lib/            # Prisma client
│   └── package.json
├── .env.example
├── package.json
└── README.md
```

## API overview

| Method | Path | Description |
|--------|------|-------------|
| POST   | `/api/auth/register` | Register |
| POST   | `/api/auth/login`     | Login |
| GET    | `/api/users/me`      | Current user (auth) |
| GET    | `/api/users/:username` | Public profile |
| PATCH  | `/api/users/me`      | Update profile (auth) |
| GET    | `/api/projects`      | List projects (query: status, type, search) |
| GET    | `/api/projects/:id`  | Project detail |
| POST   | `/api/projects`      | Create project (auth) |
| POST   | `/api/projects/:id/join` | Join project (auth) |
| GET    | `/api/challenges`    | List challenges |
| GET    | `/api/challenges/:id` | Challenge detail |
| POST   | `/api/challenges/:id/submit` | Submit solution (auth) |
| GET    | `/api/posts`         | List posts (query: section, search) |
| GET    | `/api/posts/:id`     | Post + comments |
| POST   | `/api/posts`         | Create post (auth) |
| POST   | `/api/posts/:id/comments` | Add comment (auth) |

Protected routes require header: `Authorization: Bearer <token>`.

## Security (implemented)

- Password hashing (bcrypt)
- JWT with expiry
- Rate limiting on `/api/`
- Input validation (express-validator)
- CORS configured for client origin

## Roadmap

- **Phase 2:** Learning paths (missions/tasks), events & hackathons, leaderboard, Socket.io chat
- **Phase 3:** GitHub OAuth, mobile, hiring/recruiter features

## Troubleshooting

### Deploy on Vercel (frontend + API)

Use **two Vercel projects** from the same repo:

1. **API project**
   - In Vercel: New Project -> Import this repo
   - **Root Directory:** `server`
   - Build command: `npm install && npx prisma generate`
   - `server/vercel.json` routes all requests to `server/api/index.js`
   - Add env vars in Vercel:
     - `DATABASE_URL`
     - `JWT_SECRET`
     - `CLIENT_ORIGIN` (set to your frontend Vercel URL)
     - optional: `CHALLENGE_CREATE_MIN_COMPLETED`

2. **Frontend project**
   - In Vercel: New Project -> Import this repo again
   - **Root Directory:** `client`
   - Build command: `npm run build`
   - Output directory: `dist`
   - Add env var:
     - `VITE_API_BASE_URL` = your API Vercel URL (example: `https://programmers-world-api.vercel.app`)

After deploy:
- Frontend opens on your client project URL
- Frontend API calls go to your server project URL
- Keep `CLIENT_ORIGIN` in API env synced with the frontend URL to avoid CORS issues

### Client: `npm install` fails (network, TAR_ENTRY_ERROR, or ENOTEMPTY)

The client now uses **Vite** instead of Next.js, so it has far fewer and shorter dependency paths and usually installs cleanly on Windows.

- **Network (ENOTFOUND / getaddrinfo):** Check internet, VPN, or proxy. Try again when the connection is stable.
- **TAR_ENTRY_ERROR / ENOTEMPTY (from an old Next.js install):** Delete `client/node_modules` and `client/package-lock.json`, then run `npm install` again in `client`. With Vite, path-length issues are much less common.
  - **PowerShell:** `Remove-Item -Recurse -Force node_modules; Remove-Item -Force package-lock.json` (run from `client`).
  - **CMD:** `rmdir /s /q node_modules` then `del package-lock.json` (run from `client`).
- **ENOTEMPTY / cleanup failed:** Manually delete `client/node_modules` (and `client/.next` if it still exists), then run `npm install` again in `client`.

### PowerShell: “running scripts is disabled” when running `npm`

PowerShell’s execution policy is blocking npm. Fix it in one of these ways:

- **Allow scripts for your user (recommended):** In PowerShell run once:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```
  Then run `npm install` and `npm run dev` as usual.

- **Or use Command Prompt for npm:** Run `cmd` to open Command Prompt, then:
  ```cmd
  cd client
  npm install
  npm run dev
  ```

- **Or call npm via cmd from PowerShell:** `cmd /c "npm install"` and `cmd /c "npm run dev"` (from the `client` folder).

### Browser: `404` on `/api/...` or `500` on register/login

- **404:** The API route was not found. Often the **Express server is not running** (`cd server && npm run dev` on port 4000), or the Vite proxy cannot reach it. Open [http://localhost:4000/api/health](http://localhost:4000/api/health) — you should see `{"ok":true,...}`.
- **500** on `/api/auth/register` or `/api/auth/login`: The server ran the route but **failed inside** (usually the database). Fix:
  1. Create `server/.env` with a valid `DATABASE_URL` for PostgreSQL.
  2. Start PostgreSQL.
  3. From `server`: `npx prisma generate` then `npx prisma db push`.
  4. Restart the API. In development, the JSON response may include `hint` and `details` explaining the failure.

### React / TypeScript: “Cannot find module 'react'”

Install client dependencies: from the repo root run `cd client && npm install`. If that succeeds, reload the editor; the error should go away.

---

**Built by programmers, for programmers.** 🚀
