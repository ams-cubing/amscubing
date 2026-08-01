# AMS Cubing Monorepo

![Logo AMS](apps/calendar/public/icon.png)

Monorepo for [Asociación Mexicana de Speedcubing](https://amscubing.org) apps. Shared PostgreSQL schema and local Docker setup for development.

## Apps

| App                | Path            | Port | Description                                         |
| ------------------ | --------------- | ---- | --------------------------------------------------- |
| Web                | `apps/web`      | 3000 | Marketing homepage for Asociación Mexicana de Speedcubing |
| Calendario Público | `apps/calendar` | 3001 | Public competition calendar for Mexican speedcubing |
| Tableros AMS       | `apps/boards`   | 3002 | Trello-style org boards linked to competitions |

## Packages

| Package         | Path          | Description                                              |
| --------------- | ------------- | -------------------------------------------------------- |
| `@workspace/db` | `packages/db` | Shared PostgreSQL schema, migrations, and Drizzle client |
| `@workspace/ui` | `packages/ui` | Shared UI components                                     |

## Requirements

- Node.js 20+
- pnpm
- Docker (for local PostgreSQL)

## Setup

```sh
pnpm install
cp .env.example .env.local
cp apps/calendar/.env.local.example apps/calendar/.env.local
cp apps/boards/.env.local.example apps/boards/.env.local
# Fill in WCA, auth, and Resend keys (same secret works for calendar + boards)
```

## Local development

Start PostgreSQL and apply migrations:

```sh
pnpm db:up
pnpm db:migrate
pnpm db:seed
```

Start all apps:

```sh
pnpm dev
```

Start only the calendar app:

```sh
pnpm --filter calendar dev
```

Start only the boards app:

```sh
pnpm --filter boards dev
```

Start only the marketing homepage (port 3000):

```sh
pnpm --filter web dev
```

## Database commands

| Command            | Description                            |
| ------------------ | -------------------------------------- |
| `pnpm db:up`       | Start local Postgres via Docker        |
| `pnpm db:down`     | Stop Postgres container                |
| `pnpm db:reset`    | Reset Postgres volume and restart      |
| `pnpm db:migrate`  | Apply pending migrations               |
| `pnpm db:seed`     | Seed regions, states, and AMS board template |
| `pnpm db:generate` | Generate migration from schema changes |
| `pnpm db:studio`   | Open Drizzle Studio                    |

## License

See [LICENSE](LICENSE).
