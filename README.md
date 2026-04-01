# 🌍 Programmers World

A unified platform for programmers to **learn**, **build**, **compete**, and **collaborate**. Built for students and early-career developers, scalable for professionals and companies.

## What's included (MVP)

- **User authentication** — Register, login, JWT
- **Developer profiles** — Username, bio, skills, rank, projects, badges
- **Project playground** — Create projects, join with a role (frontend/backend/UI/UX/fullstack), browse and search
- **Community** — Sections (General, Debug help, Project feedback, etc.), posts, threaded comments, mark solution
- **Coding challenges** — List challenges, submit solutions, earn points

## Tech stack

| Layer      | Stack                |
|-----------|----------------------|
| Frontend  | Vite, React, React Router, Tailwind CSS |
| Backend   | Node.js, Express     |
| Database  | PostgreSQL + Prisma |
| Auth      | JWT, bcrypt          |

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

The **client** (Vite) proxies `/api` to the backend by default (`http://localhost:4000`). To use a different API URL in dev, set `VITE_API_URL` in `client/.env` (e.g. `VITE_API_URL=http://localhost:4000`).

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

Only admins can **create** coding challenges (`POST /api/challenges`). The demo account cannot.

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

**Important:** The Next.js app proxies `/api/*` to the backend when `NEXT_PUBLIC_API_URL` is set. So the frontend must be able to reach the backend (same machine or correct URL).

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
