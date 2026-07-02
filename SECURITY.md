# Security

This document describes known tradeoffs in the current auth and messaging model, and the planned mitigations before handling real user data at scale.

## Current authentication model

| Aspect | Today |
|--------|--------|
| Token storage | **httpOnly cookie** (`pw_session`) — not readable by JavaScript |
| Token lifetime | 7 days (`expiresIn: '7d'`) |
| API auth | Cookie on every request (`credentials: 'include'`); legacy Bearer header still accepted |
| Google OAuth | Server sets cookie on callback redirect; no JWT in URL |
| Logout | `POST /api/auth/logout` clears the cookie |

### Cross-origin (Vercel)

- API and frontend are separate origins → cookie uses `SameSite=None; Secure` in production.
- CORS uses `credentials: true` and an explicit `CLIENT_ORIGIN`.
- Frontend `fetch` uses `credentials: 'include'` on all API calls.

### Legacy note

Older clients stored JWT in `localStorage` (`pw_token`). That path was removed; sessions restore via `GET /api/users/me` on app load.

---

## Previously planned (done)

~~JWT in localStorage~~ → httpOnly cookie (implemented).

~~OAuth token in URL~~ → cookie set on server redirect; callback uses `?redirect=` only.

---

## Direct messages — block & mute

Users can **block** others from a profile or DM chat. Blocked users cannot send messages or open the thread with the blocker. Either party blocking the other stops new messages both ways.

Users can **mute** a conversation to hide it from their inbox without notifying the other person. Muted threads can still be opened via profile → Message.

Manage blocks under **Settings → Blocked users**. Block/mute API: `/api/messages/block/:userId`, `/api/messages/mute/:userId`, `/api/messages/blocks`.

---

## Password reset

Email/password users can use **Forgot password** (`/forgot-password`) and **Reset password** (`/reset-password`). Tokens are hashed in the database, expire, and are single-use. Rate limits apply on auth routes.

Without `RESEND_API_KEY`, reset links are logged to the server console in development only — configure email before onboarding non-technical users in production.

---

## What is already in good shape

- Passwords hashed with bcrypt
- Production fail-closed for missing `JWT_SECRET`, `CLIENT_ORIGIN`, `GITHUB_TOKEN`
- CORS restricted in production
- Global API rate limiting
- Input validation on auth and write routes
- Ban / appeal flow for moderation
- OAuth open-redirect check on `redirect` param

---

## Priority order (recommended)

1. ~~**DM block / mute**~~ — implemented
2. **Production API wiring** — separate Vercel project for `server/`, `VITE_API_BASE_URL` on frontend build
3. **Shorter session / refresh tokens** — optional hardening (sessions are 7 days today)
4. **Email delivery** — `RESEND_API_KEY` for password reset in production

See also [CONTRIBUTING.md](./CONTRIBUTING.md) and the README roadmap.
