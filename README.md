# TeamHub

Internal team management app: member accounts, daily work logs, a news/forum board, and activity time tracking via an external integration with MyLifeLes.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript)
- [Prisma](https://prisma.io) + PostgreSQL
- [NextAuth](https://authjs.dev) (credentials login, JWT sessions)
- Tailwind CSS
- [Vitest](https://vitest.dev) (unit tests)

## Setup

Prerequisites: Node.js 20+, PostgreSQL running locally (or reachable via `DATABASE_URL`).

```bash
npm install
```

Create `.env` (see `.env` for the existing local defaults):

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/teamhub?schema=public"
AUTH_SECRET="<random base64 string>"
MYLIFELES_API_BASE_URL="http://localhost:3000/api/mock-mylifeles"
```

`MYLIFELES_API_BASE_URL` is optional — it defaults to a local mock endpoint bundled with the app (see [MyLifeLes API integration](#mylifeles-api-integration)). Point it at MyLifeLes's real API base URL once that's available.

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Apply the database schema:

```bash
npx prisma migrate dev
```

Seed the first leader account:

```bash
npm run db:seed
```

This creates nickname `admin` / password `changeme123` (override with `SEED_LEADER_NICKNAME`, `SEED_LEADER_PASSWORD`, `SEED_LEADER_REALNAME` env vars). **Change the password after first login.**

Run the dev server:

```bash
npm run dev
```

## Testing

Unit tests cover the app's core business rules: date/time utilities, the Work Log "2–5 tasks" rule, and parsing/validating MyLifeLes's response (including the HTTP call, with `fetch` mocked). They don't require a database.

```bash
npm run test        # run once
npm run test:watch  # watch mode
```

## Features

| Feature | Routes | Notes |
|---|---|---|
| Member management | `/members` | Leader-only. Add/edit/remove members, set real name, nickname, password, role. |
| Work Log | `/worklog`, `/worklog/team` | Members log 2–5 daily tasks + results. Leader can browse any member, any date. |
| News & Forum | `/news`, `/forum` | Shared post/comment model. News posts and forum topics, both with comments/answers. Authors or the leader can delete. |
| Activity Time Log | `/activity`, `/activity/team` | Members connect their MyLifeLes account and pull their daily time on demand (see below). Leader can browse any member, any date. |

Roles: `MEMBER` and `LEADER`. Leader-only routes are enforced in [`proxy.ts`](proxy.ts).

## MyLifeLes API integration

TeamHub pulls each member's daily activity time **from** MyLifeLes — MyLifeLes doesn't push to TeamHub. This contract isn't part of a real MyLifeLes spec — it's a reasonable default designed to be easy to adjust once the actual MyLifeLes API is known. The base URL is configurable via `MYLIFELES_API_BASE_URL`.

### Connecting an account

Each member pastes their own MyLifeLes API token at **Activity → Connect MyLifeLes** (`/activity`). TeamHub stores it and uses it to call MyLifeLes on that member's behalf. Members can disconnect at any time (previously-synced history is kept).

### Syncing

Clicking **Sync now** calls MyLifeLes for today's activity and replaces today's entries in TeamHub with whatever MyLifeLes currently reports — so re-syncing is safe and never double-counts. There's no automatic/scheduled sync yet; each member triggers it manually.

### What TeamHub calls

```
GET {MYLIFELES_API_BASE_URL}/activities?date=YYYY-MM-DD
Authorization: Bearer <member's MyLifeLes token>
```

**Expected response (200)**

```json
{
  "date": "2026-11-04",
  "activities": [
    { "name": "Coding", "minutes": 90 },
    { "name": "Meeting", "minutes": 45 }
  ]
}
```

| Field | Type | Notes |
|---|---|---|
| `activities[].name` | string | Required, non-empty. Becomes the activity label shown in TeamHub. |
| `activities[].minutes` | positive number | Required. Rounded to the nearest integer. |

A `401` response is treated as an invalid/expired MyLifeLes token (surfaced to the member so they can reconnect). Any other non-2xx status, or a body that doesn't match this shape, fails the sync with an error message.

### Local mock (no real MyLifeLes account needed)

[`app/api/mock-mylifeles/activities/route.ts`](app/api/mock-mylifeles/activities/route.ts) is a stand-in for MyLifeLes's real API, bundled so the feature can be built and demoed before real MyLifeLes API access exists. It accepts any non-empty bearer token and returns a fixed sample day. `MYLIFELES_API_BASE_URL` defaults to it. **Delete this route and point `MYLIFELES_API_BASE_URL` at the real MyLifeLes API once available.**

### Viewing the data

- Members see their own recent activity, grouped by day, at `/activity`.
- The leader can browse any member's activity for any date at `/activity/team`.

Implementation: [`lib/mylifeles.ts`](lib/mylifeles.ts) (response parsing + the outbound call), [`app/activity/actions.ts`](app/activity/actions.ts) (connect/sync/disconnect).

## Known limitations

- The MyLifeLes contract above is a placeholder; update the schema/lib/docs once the real MyLifeLes API is known.
- Sync is manual only (no scheduled/background sync).
