# Monorepo AMS Cubing

![Logo AMS](apps/calendar/public/icon.png)

Monorepo de las apps de la [Asociación Mexicana de Speedcubing](https://amscubing.org). Esquema PostgreSQL compartido y entorno Docker local para desarrollo.

Ver [ROADMAP.md](ROADMAP.md) para el trabajo planeado (auth en web, paridad de CMS/blog con amscubing.org, cursos en subdominio).

## Apps

| App                | Ruta            | Puerto | Descripción                                                          |
| ------------------ | --------------- | ------ | -------------------------------------------------------------------- |
| Web                | `apps/web`      | 3000   | Portada de la Asociación Mexicana de Speedcubing                     |
| Calendario Público | `apps/calendar` | 3001   | Calendario público de competencias de speedcubing en México          |
| Tableros AMS       | `apps/boards`   | 3002   | Tableros de organización estilo Trello ligados a competencias        |
| Cursos AMS         | `apps/courses`   | 3003   | Cursos, lecciones, evaluaciones y progreso con cuenta AMS o WCA      |
| Blog AMS           | `apps/blog`     | 3004   | Entradas, editor visual y comentarios moderados con cuenta AMS o WCA |

## Paquetes

| Paquete           | Ruta            | Descripción                                                  |
| ----------------- | --------------- | ------------------------------------------------------------ |
| `@workspace/db`   | `packages/db`   | Esquema PostgreSQL compartido, migraciones y cliente Drizzle |
| `@workspace/ui`   | `packages/ui`   | Componentes de UI compartidos                                |
| `@workspace/auth` | `packages/auth` | Better Auth compartido (WCA) + cookies de sesión entre apps  |

El inicio de sesión lo emite la app **web** desde `/iniciar-sesion` y `/api/auth/[...all]`. Web, calendario y tableros comparten la cookie de sesión `ams.*` (el mismo `BETTER_AUTH_SECRET`). En producción hay que definir `AUTH_COOKIE_DOMAIN=.amscubing.org` en las apps que compartan sesión.

## Requisitos

- Node.js 20+
- pnpm (versión declarada en `package.json`)
- Docker (para PostgreSQL local)

En Windows, instalar Docker Desktop con el backend WSL 2. Si la instalación
solicita reiniciar Windows, hacerlo antes de levantar PostgreSQL y abrir Docker
Desktop hasta que el motor esté listo.

## Configuración

```sh
pnpm install
cp .env.example .env.local
cp apps/web/.env.local.example apps/web/.env.local
cp apps/calendar/.env.local.example apps/calendar/.env.local
cp apps/boards/.env.local.example apps/boards/.env.local
cp apps/courses/.env.local.example apps/courses/.env.local
cp apps/blog/.env.local.example apps/blog/.env.local
# Completar claves de WCA, auth y Resend (el mismo secret sirve para las cinco apps)
```

En PowerShell, usar `Copy-Item` en lugar de `cp` si se prefiere. Generar una
clave `BETTER_AUTH_SECRET` aleatoria compartida entre las cinco apps. Las claves
WCA y Resend se obtienen de sus respectivas cuentas; son necesarias para probar
inicio de sesión y envío de correo. Los archivos `.env.local` no se versionan.

PostgreSQL local usa `postgres:18-alpine`, el puerto `5432` y un volumen
persistente. La conexión de desarrollo está definida en `.env.example`.

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

Para cursos, mantener la web encendida (host de registro e inicio de sesión) y ejecutar:

```sh
pnpm --filter courses dev
```

`NEXT_PUBLIC_COURSES_URL=http://localhost:3003` configura los enlaces y el regreso
después del inicio de sesión. En producción usar `https://cursos.amscubing.org`
y compartir `AUTH_COOKIE_DOMAIN=.amscubing.org` y `BETTER_AUTH_SECRET` entre apps.
El callback WCA sigue siendo `http://localhost:3000/api/auth/callback/wca`.

Ver [apps/courses/README.md](apps/courses/README.md) para permisos y migración Sensei.

## Comandos de base de datos

| Comando                 | Descripción                                                      |
| ----------------------- | ---------------------------------------------------------------- |
| `pnpm db:up`            | Levantar Postgres local con Docker                               |
| `pnpm db:down`          | Detener el contenedor de Postgres                                |
| `pnpm db:reset`         | Resetear el volumen de Postgres y reiniciar                      |
| `pnpm db:migrate`       | Aplicar migraciones pendientes                                   |
| `pnpm db:seed`          | Sembrar regiones, estados y plantilla de tablero AMS             |
| `pnpm db:seed-template` | Reemplazar la plantilla AMS con los datos del seed (destructivo) |
| `pnpm db:generate`      | Generar migración a partir de cambios de esquema                 |
| `pnpm db:studio`        | Abrir Drizzle Studio                                             |

## Licencia

Ver [LICENSE](LICENSE).

## Blog y cuentas locales

`apps/blog` usa el puerto 3004: `pnpm --filter blog dev`. Configurar `NEXT_PUBLIC_BLOG_URL=http://localhost:3004`; en producción, `https://blog.amscubing.org`. El blog tiene permisos independientes de Cursos, editor visual de secciones y comentarios moderados. Ver [apps/blog/README.md](apps/blog/README.md).

El acceso canónico en la web permite registro con correo y contraseña, verificación de correo y vinculación posterior con WCA. Para entregar correos en producción configurar Resend; el buzón de desarrollo es privado y queda en `.codex/dev-mail`.

### Perfil AMS

`/cuenta` permite editar nombre, ciudad y presentación privada, consultar el nivel y los permisos por aplicación, verificar correo, vincular WCA, cambiar contraseña y cerrar otras sesiones. La desvinculación WCA exige correo verificado y una contraseña AMS para conservar el acceso.

La gestión central de Blog y Cursos conserva sus tablas independientes. Administradores y desarrolladores gestionan su propia aplicación; delegados pueden gestionar ambas. El destinatario debe verificar su correo y los cambios sobre la propia cuenta están bloqueados. Los cambios hechos desde el perfil se registran en `permission_audit`. La Web conserva su panel de delegados y editores; Calendario y Tableros siguen sujetos a las competencias y membresías asignadas.

Los datos privados se guardan en `user_profile` (migración 0037). No se muestran en páginas públicas. El WCA ID y los roles no son campos editables del perfil.
