# Roadmap

Plan vivo del monorepo de AMS Cubing. Los ítems cambian de fase conforme se van entregando.

## Principios

- Una sola identidad: inicio de sesión con WCA vía Better Auth y cookies `ams.*` compartidas en `*.amscubing.org`.
- Apps por dominio: web es la casa pública; el calendario es dueño de las competencias; los tableros son dueños del trabajo de organización; los cursos siguen siendo un producto aparte (WordPress ahora, una app después).
- Preferir paquetes compartidos (`@workspace/db`, `@workspace/auth`, `@workspace/ui`) en lugar de duplicar lógica.
- La web **lee** datos compartidos (delegados, competencias anunciadas). No es dueña de esos ciclos de vida.

---

## Ahora / Corto plazo

### Auth en la app web

- [ ] Mover el host canónico de Better Auth del calendario → **web** (`amscubing.org` / puerto 3000).
- [ ] Actualizar `@workspace/auth` (`getAuthBaseUrl`, orígenes de confianza, dominio de cookies) para que web, calendario y tableros compartan sesión.
- [ ] Apuntar las URIs de redirección de OAuth de la WCA a la app web; dejar calendario/tableros solo como consumidores de cookies.
- [ ] UX de iniciar / cerrar sesión en web; deep-links de vuelta a calendario y tableros después del login.
- [ ] Documentar variables de entorno (`BETTER_AUTH_URL`, `NEXT_PUBLIC_*`, `AUTH_COOKIE_DOMAIN`) para las tres apps.

### Web como reemplazo de amscubing.org

Paridad con la **portada y el blog** actuales de WordPress, y luego retirar WordPress del apex. Los cursos se quedan en un subdominio (ver abajo).

**Público**

- [ ] Próximas competencias en la web desde `@workspace/db`: `statusPublic = announced`, fechas futuras, lista corta + enlace a `calendario.*`. El mismo patrón que delegados (`getPublicDelegates`).
- [ ] Blog: listado, detalle de post, categorías/etiquetas, SEO (títulos, OG, sitemap).
- [ ] Comentarios en posts (auth obligatorio o invitado moderado — por decidir).
- [ ] Mantener misión, visión, delegados y contacto sincronizados con el CMS o la BD donde haga falta.
- [ ] Enlace en nav / teaser a `cursos.amscubing.org` (no reconstruir el LMS en la web).
- [ ] Redirecciones de URLs viejas de WordPress → rutas nuevas de Next.js (y `/detalle-cursos/` → `cursos.*`).

**Admin / gestión (panel en web)**

- [ ] CRUD de posts del blog (borrador/publicar, texto enriquecido o MDX, imagen de portada vía Blob o similar).
- [ ] Moderar comentarios.
- [ ] Comprobación de roles (delegado / editor de contenido — ampliar roles si hace falta).
- [ ] Biblioteca de medios / subidas.

**Datos**

- [ ] Esquema en `@workspace/db`: `post`, `post_comment` (nombres por definir). Sin tablas de cursos hasta migrar fuera de WordPress.
- [ ] Migraciones + seed del contenido del **blog** de WordPress si se migra el historial.

### Aislar cursos en WordPress

Dejar el plugin LMS actual en marcha; dejar de servirlo desde el apex.

- [ ] Hospedar el plugin solo en `cursos.amscubing.org`.
- [ ] Apex `amscubing.org` → `apps/web`; conservar `calendario.*` / `tablero.*`.
- [ ] Confirmar que login/progreso del plugin siguen funcionando en el subdominio.

El calendario sigue siendo la fuente de verdad de las competencias. Marcar **Anunciada** es lo que hace que una competencia aparezca en la web. Sin un flag extra de “público para el sitio”.

---

## Siguiente

### Profundidad de producto en calendario y tableros

- [ ] Feriados / pulido del calendario (ya en curso).
- [ ] Nav entre apps: menú de cuenta consistente que enlace web ↔ calendario ↔ tableros (y cursos).

### Publicar en redes al marcar como celebrada

Al usar **Marcar como celebrada** en el panel de delegados, publicar en las redes de AMS (p. ej. Facebook/Instagram) un post con los datos de la competencia (nombre, ciudad, fechas, URL WCA, etc.).

- [ ] Campo `logo` (o similar) en `competition`: URL/Blob. La mayoría ya tienen logo; algunas no — el flujo debe permitir publicarlo sin logo o pedir uno opcional al marcar celebrada.
- [ ] UI para subir / editar el logo de la competencia (formulario y/o prompt al celebrar si falta).
- [ ] Integración de APIs de redes AMS: al confirmar **Marcar como celebrada**, redactar y publicar el post con los datos + logo si existe.
- [ ] Guardar ids de posts / `celebratedPostedAt` (o similar) para evitar duplicados si se reintenta.
- [ ] La tarjeta del tablero “Publicación FB Torneo de Rubik” puede quedar como checklist humana o alinearse con este flujo automático.

### Plataforma

Mejoras de ingeniería del monorepo (auditoría 2026-08-28). Priorizar CI y tests antes de crecer más el producto.

#### CI/CD y quality gates

Hoy solo existe el workflow de migraciones (`.github/workflows/migrate.yml`). No hay CI para build, lint, typecheck ni tests.

- [x] Workflow de CI en PRs: `build`, `lint`, `check-types`, `test` en todas las apps y paquetes.
- [x] Scripts `lint` en **cada** app y paquete (hoy solo `@workspace/ui` lo define; `pnpm lint` en la raíz casi no hace nada).
- [x] Scripts `check-types` (`tsc --noEmit`) en cada workspace — la tarea existe en `turbo.json` pero ningún paquete la expone.
- [x] `pnpm test` debe ejecutar **calendar y `@workspace/db`** (hoy solo calendar).
- [x] Registrar tareas `test` y `check-types` en `turbo.json` para cache y paralelismo.
- [ ] Migrar la BD en preview de Vercel si hace falta (además de staging/main).

#### Testing

Solo hay 6 archivos de test (`packages/db`: 2, `calendar`: 4; `boards` y `web`: 0). No hay E2E.

- [x] Tests unitarios en `@workspace/auth` (tipos, URLs, cookie domain).
- [x] Tests en `apps/boards` — empezar por server actions (`board-actions.ts`, ~700 líneas sin cobertura).
- [x] Tests en `apps/web` cuando tenga lógica de BD/auth.
- [ ] E2E mínimo: login WCA, ciclo de vida de una competencia, operación básica en tablero.
- [x] Reutilizar el patrón de mocks del calendario (`auth`, `db`, `revalidatePath`) en tableros.

#### Lint, formato y hooks

- [ ] Config de Prettier compartida (hoy solo hay script `format` en la raíz, sin `.prettierrc`).
- [ ] Pre-commit hooks opcionales (Husky + lint-staged) para lint/format en archivos tocados.

#### Paquetes compartidos y deduplicación

- [x] Helpers de sesión compartidos (`requireSession`, `requireDelegate`) — unificar el patrón Result del calendario vs `unauthorized()` de tableros.
- [x] `requireDelegate` centralizado (hoy reimplementado en `board-management.ts`).
- [x] `PreviewBanner` → paquete compartido (copia idéntica en calendario y tableros).
- [x] `Providers` compartido (ThemeProvider; Nuqs solo donde aplique).
- [x] Email: calendario usa `resend` directo en 4 archivos; unificar en `@workspace/email` como tableros.
- [x] Validación con Zod en server actions de tableros (dependencia declarada pero sin uso).
- [x] Manejo de errores consistente — adoptar `handle-error.ts` del calendario o un helper equivalente compartido.

#### Tipos de auth

- [ ] Extender tipos de Better Auth en `@workspace/auth` para alinear `session.user` con el `User` de Drizzle.
- [ ] Eliminar casts `as unknown as User` en tableros (y similares en formularios del calendario).

#### Organización del código

- [ ] Partir `packages/db/src/schema.ts` (~780 líneas) por dominio (`auth`, `competitions`, `boards`, `notifications`, …).
- [ ] Partir `apps/boards/.../board-actions.ts` en módulos (cards, comentarios, labels, notificaciones, permisos).

#### Dependencias y toolchain

- [ ] Alinear TypeScript (raíz 5.7 vs apps/paquetes 5.9).
- [ ] Alinear versiones duplicadas (`lucide-react`, etc.) — considerar pnpm catalog u overrides en la raíz.
- [ ] Revisar `--debug-prerender` en build de calendar (solo dev/debug o intencional en prod).

#### Observabilidad y ops

- [ ] Error tracking en producción (p. ej. Sentry) en las tres apps.
- [ ] Logging estructurado en server actions críticas.
- [ ] Rate limiting en formularios públicos y envíos de email (p. ej. solicitar fecha).

#### Documentación de entorno

- [ ] `.env.example` raíz más completo (hoy solo `DATABASE_URL`).
- [ ] `apps/web/.env.local.example` antes de mover auth a web.
- [ ] Referencia única de variables por app (`BETTER_AUTH_*`, `WCA_*`, `RESEND_*`, URLs públicas, cookie domain).

#### Seguridad

- [ ] Documentar que `apps/calendar/proxy.ts` no valida auth de forma segura (checks por ruta/página — intencional).
- [ ] Respuestas tipadas forbidden/unauthorized en server actions en lugar de `throw new Error(...)` genérico donde aplique.

---

## Después

- [ ] Dar de baja WordPress de **blog/portada** cuando las redirecciones y la paridad de contenido estén verificadas. Conservar `cursos.*` hasta reemplazar el LMS.
- [ ] App de cursos en el monorepo (`apps/courses` o similar): catálogo, módulos, inscripción, cookies `ams.*` compartidas. El esquema (`course`, `course_module`, `enrollment`) llega entonces.
- [ ] Certificados de curso / insignias de finalización.
- [ ] Opcional: acción dedicada **Anunciar** que redacte (o más adelante publique) el texto previo al evento. Distinto de la publicación post-celebración. No auto-publicar solo por guardar estatus como anunciada.
- [ ] Newsletter o resúmenes de anuncios.
- [ ] API pública o RSS del blog.
- [ ] RBAC más fuerte (editor de contenido vs delegado vs admin).

---

## Fuera de alcance (por ahora)

- Reemplazar a la WCA como proveedor de identidad.
- Fusionar calendario + tableros en un solo deployable.
- Reconstruir el LMS dentro de `apps/web`.
- Auto-publicar en Facebook/Instagram solo por guardar una competencia como **anunciada** (la publicación automática va ligada a **celebrada**).

---

## Registro de decisiones

| Fecha      | Decisión                      | Notas                                                                                                                        |
| ---------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| TBD        | Host de auth = web            | El calendario deja de ser dueño de los callbacks de OAuth                                                                    |
| TBD        | Enfoque de CMS                | BD + UI de admin vs archivos MDX — preferir BD para blog/comentarios                                                         |
| 2026-08-18 | Los cursos no van en la web   | LMS de WordPress en `cursos.amscubing.org` primero; después una app dedicada, no `apps/web`                                  |
| 2026-08-18 | Comps en web = `announced`    | El calendario es dueño del ciclo de vida; la web solo lista filas futuras con `statusPublic = announced`                     |
| 2026-08-20 | Redes al marcar **celebrada** | Publicar en redes AMS desde **Marcar como celebrada** con datos de la comp; el dato extra es el logo (opcional si no existe) |
| 2026-08-18 | Anunciada ≠ post en redes     | Aparecer en el sitio = `announced`; post social del evento terminado = acción de celebrada (no al anunciar)                  |
| 2026-08-28 | Auditoría de plataforma       | CI, tests, deduplicación y tipos de auth documentados en sección **Plataforma**; priorizar quality gates antes de más features |
