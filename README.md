# Monorepo AMS Cubing

![Logo AMS](apps/calendar/public/icon.png)

Monorepo de las apps de la [Asociación Mexicana de Speedcubing](https://amscubing.org). Esquema PostgreSQL compartido y entorno Docker local para desarrollo.

Ver [ROADMAP.md](ROADMAP.md) para el trabajo planeado (auth en web, paridad de CMS/blog con amscubing.org, cursos en subdominio).

## Apps

| App                | Ruta            | Puerto | Descripción                                                   |
| ------------------ | --------------- | ------ | ------------------------------------------------------------- |
| Web                | `apps/web`      | 3000   | Portada de la Asociación Mexicana de Speedcubing              |
| Calendario Público | `apps/calendar` | 3001   | Calendario público de competencias de speedcubing en México   |
| Tableros AMS       | `apps/boards`   | 3002   | Tableros de organización estilo Trello ligados a competencias |

## Paquetes

| Paquete           | Ruta            | Descripción                                                  |
| ----------------- | --------------- | ------------------------------------------------------------ |
| `@workspace/db`   | `packages/db`   | Esquema PostgreSQL compartido, migraciones y cliente Drizzle |
| `@workspace/ui`   | `packages/ui`   | Componentes de UI compartidos                                |
| `@workspace/auth` | `packages/auth` | Better Auth compartido (WCA) + cookies de sesión entre apps  |

El inicio de sesión lo emite la app de **calendario**. Calendario y tableros comparten la cookie de sesión `ams.*` (el mismo `BETTER_AUTH_SECRET`). En producción hay que definir `AUTH_COOKIE_DOMAIN=.amscubing.org` en ambas apps.

## Requisitos

- Node.js 20+
- pnpm
- Docker (para PostgreSQL local)

## Configuración

```sh
pnpm install
cp .env.example .env.local
cp apps/calendar/.env.local.example apps/calendar/.env.local
cp apps/boards/.env.local.example apps/boards/.env.local
# Completar claves de WCA, auth y Resend (el mismo secret sirve para calendario + tableros)
```

## Desarrollo local

Levantar PostgreSQL y aplicar migraciones:

```sh
pnpm db:up
pnpm db:migrate
pnpm db:seed
```

Arrancar todas las apps:

```sh
pnpm dev
```

Arrancar solo la app de calendario:

```sh
pnpm --filter calendar dev
```

Arrancar solo la app de tableros:

```sh
pnpm --filter boards dev
```

Arrancar solo la portada (puerto 3000):

```sh
pnpm --filter web dev
```

## Comandos de base de datos

| Comando            | Descripción                                          |
| ------------------ | ---------------------------------------------------- |
| `pnpm db:up`       | Levantar Postgres local con Docker                   |
| `pnpm db:down`     | Detener el contenedor de Postgres                    |
| `pnpm db:reset`    | Resetear el volumen de Postgres y reiniciar          |
| `pnpm db:migrate`  | Aplicar migraciones pendientes                       |
| `pnpm db:seed`     | Sembrar regiones, estados y plantilla de tablero AMS |
| `pnpm db:generate` | Generar migración a partir de cambios de esquema     |
| `pnpm db:studio`   | Abrir Drizzle Studio                                 |

## Licencia

Ver [LICENSE](LICENSE).
