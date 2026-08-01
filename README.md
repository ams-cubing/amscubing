# AMS Cubing Monorepo

![Logo AMS](apps/calendar/public/icon.png)

Monorepo for [Asociación Mexicana de Speedcubing](https://amscubing.org) apps. Shared PostgreSQL schema and local Docker setup for development.

## Apps

| App                | Path            | Description                                         |
| ------------------ | --------------- | --------------------------------------------------- |
| Web                | `apps/web`      | Marketing homepage for Asociación Mexicana de Speedcubing |
| Calendario Público | `apps/calendar` | Public competition calendar for Mexican speedcubing |

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
# Fill in WCA, auth, and Resend keys in apps/calendar/.env.local
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

Start only the marketing homepage (port 3001):

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
| `pnpm db:seed`     | Seed regions and Mexican states        |
| `pnpm db:generate` | Generate migration from schema changes |
| `pnpm db:studio`   | Open Drizzle Studio                    |

## License

See [LICENSE](LICENSE).
