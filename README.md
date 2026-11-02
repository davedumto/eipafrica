# EIP Africa

A two-sided marketplace for energy and infrastructure opportunities in Africa. Organizations post
opportunities (investment, EPC, tenders, assets, mandates), other organizations browse, enquire and
message them, and admins review and moderate everything.

For the full architecture, data model, user flows and open items, see the
[engineering handoff doc](https://claude.ai/artifact/E8wzTrY5rLbYVjj5h2eDuE).

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Postgres (Neon) + Drizzle ORM
- Auth.js v5 (Credentials provider, JWT sessions)
- Pusher Channels (real-time messaging & notifications)
- Vercel Blob (private document storage)
- nodemailer (transactional email)

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill in real values
pnpm dev
```

`pnpm build` is the real correctness check — the dev server's Fast Refresh can serve stale bundles
after schema or env changes.

See `.env.example` for every environment variable this project needs.

## Database

Schema lives in `lib/db/schema.ts`. Migrations are applied as hand-written SQL directly against the
database, not via `drizzle-kit push` — there's no migration history file, so the schema file and the
live database are expected to already match.
