# AMS Cubing - Contexto Para Agentes

## Objetivo actual

`apps/web` es el reemplazo público de `amscubing.org`; el blog y los cursos viven en sus propias apps (`apps/blog`, `apps/courses`) y reemplazan las partes correspondientes del WordPress actual.

La home sigue la estructura visual del rediseño: hero, próximos torneos, ranking nacional, bloque breve de sobre nosotros, comunidad/testimonios, CTA y footer. No meter la página completa de Nosotros debajo del ranking. Header y footer mantienen las secciones del diseño: Home, Nosotros, Torneos, Blog y Cursos.

`/nosotros` es una página aparte. Ahí viven misión, visión, objetivos, planes, delegados WCA con foto/enlace oficial y momentos de comunidad.

## Roadmap relevante

- `apps/web` es la casa pública: portada, página Nosotros, delegados, contacto, cuenta/auth y enlaces a calendario, blog y cursos. En la portada no se muestran misión ni visión porque pertenecen a `/nosotros`.
- `apps/calendar` sigue siendo dueño del ciclo de vida de competencias.
- La web solo debe leer competencias públicas con `competition.statusPublic = "announced"` y fechas futuras.
- El blog no se reconstruye dentro de `apps/web`: vive en `apps/blog` (`blog.amscubing.org`).
- Los cursos no se reconstruyen dentro de `apps/web`: viven en `apps/courses` (`cursos.amscubing.org`), que reemplaza al LMS de WordPress.
- WordPress queda como fuente de paridad de portada mientras se terminan redirecciones y contenido.
- Todo formulario público o envío de email nuevo debe usar el rate limit compartido (ver abajo).

## Arquitectura rápida

- Monorepo pnpm + Turbo.
- Apps:
  - `apps/web` (3000): sitio público Next.js y host canónico de auth.
  - `apps/calendar` (3001): calendario y panel de competencias.
  - `apps/boards` (3002): tableros de organización.
  - `apps/courses` (3003): cursos, lecciones, evaluaciones e inscripción; importador Sensei (`import:sensei`).
  - `apps/blog` (3004): entradas, editor visual, comentarios moderados; importador WordPress (`import:wordpress`). Imágenes del editor en UploadThing (`apps/blog/lib/uploadthing.ts`, requiere `UPLOADTHING_TOKEN`).
- Paquetes:
  - `@workspace/db`: Drizzle, schema y datos compartidos.
  - `@workspace/auth`: Better Auth y helpers de sesión.
  - `@workspace/ui`: componentes UI compartidos. Chrome global AMS vive aquí y lo usan todas las apps: `AmsSiteNav` + `AmsAccountMenu` (web), `AmsAppNav` (calendar, boards, blog, courses), `AmsHeaderNotifications` (bandeja; cada app pasa sus server actions creadas con `createNotificationHandlers` de `@workspace/auth/notifications`), `AmsSiteFooter`, `AmsAppSubnav` (subnavegación de blog y cursos) y `AmsStatusPage` (401/403/404/500). Competencias es ruta de `apps/web` (`/competencias`) con enlace al calendario.
  - Formularios con server actions: la acción recibe `(estado, formData)` y envuelve su lógica en `runAction` de `@workspace/server/action` (lanza `ActionError` para mensajes al usuario, devuelve `{ ok, message }`); el cliente usa `ActionForm` de `@workspace/ui/components/action-form`, que muestra el mensaje con un toast de sonner. Para avisos tras un `redirect` (`?guardado=1`) usa `SearchParamToast` dentro de `Suspense`. No usar banners `?error=`.
  - Blog y cursos usan `cacheComponents` como web/calendar/boards: datos sin caché van bajo `Suspense`/`loading.tsx`, sin `export const dynamic`/`runtime`; acceso denegado con `forbidden()`/`unauthorized()` (`authInterrupts`).
  - `@workspace/email`: envío de correos (Resend).
  - `@workspace/social`: publicación en Facebook/Instagram al anunciar competencias.
  - `@workspace/server`: utilidades solo de servidor compartidas por todas las apps:
    - `@workspace/server/log`: logger estructurado (`log.info/warn/error(evento, campos)`, una línea JSON). Usarlo en server actions y paquetes en lugar de `console.*`; los scripts CLI (`seed`, `migrate`, importadores) pueden seguir con `console`.
    - `@workspace/server/env`: validación de variables de entorno. Cada app la ejecuta en `instrumentation.ts` al arrancar; si agregas una variable nueva, declárala ahí, en el `turbo.json` de la app y en `.env.example`.
    - `@workspace/server/security-headers`: cabeceras de seguridad para `next.config.mjs`. La CSP va en modo `Report-Only`; si integras un host externo nuevo (scripts, fetch desde el cliente, iframes), agrégalo antes de pasar a modo estricto.
- Subidas a UploadThing: cada `onUploadComplete` debe llamar a `recordUpload` de `@workspace/db/uploads` para registrar la `key` en la tabla `uploaded_file` (base para limpiar huérfanos y la biblioteca de medios).
- Rate limiting: `consumeRateLimit` de `@workspace/db/rate-limit` (contador de ventana fija sobre la tabla `rate_limit` de Better Auth). Las llaves deben ir con namespace `<app>:<acción>:<ámbito>:<id>`, p. ej. `blog:comment:user:<id>` o `calendar:date-request:ip:<ip>`. No crear tablas de rate limit por app.

## Web actual

- Página principal: `apps/web/app/page.tsx`.
- Página Nosotros: `apps/web/app/nosotros/page.tsx`.
- Página Torneos: `apps/web/app/competencias/page.tsx`, lee competencias anunciadas desde `@workspace/db` y enriquece datos faltantes con la API WCA mediante `apps/web/lib/competitions.ts`. Incluye CTA a `getCalendarUrl()` para el calendario completo.
- Página Blog: `apps/web/app/blog/page.tsx` solo redirige a `getBlogUrl()`; el blog real está en `apps/blog`.
- Página Cursos: `apps/web/app/cursos/page.tsx` es una landing que enlaza a `apps/courses` (`COURSES_URL` = `getCoursesUrl()`).
- Página Cuenta: `apps/web/app/cuenta/page.tsx`, usa la sesión compartida de `@workspace/auth` y funciona como hub de acciones. Usuarios generales ven mis competencias, blog y cursos; delegados ven además crear competencias, tableros, blog editorial y cursos. Roles globales: `user`, `delegate`, `editor`; los permisos finos de blog y cursos van en `blog_staff` y `course_staff`. Se asignan solo desde `apps/web/app/admin/permisos` (reglas en `@workspace/auth/permissions`, notificación al usuario incluida); blog y cursos solo enlazan ahí. Los scripts `staff:grant` quedan para el bootstrap local.
- `user.wcaId` puede ser `null`: cuentas WCA que nunca han competido pueden iniciar sesión. Organizadores (`competition_organizer.organizer_user_id`) y solicitantes (`competition.requested_by_user_id`, `date_request.requested_by_user_id`) se guardan por `user.id`, así que alguien sin WCA ID (p. ej. un padre que organiza) puede solicitar fechas, ser organizador, ver mis competencias y entrar a tableros. Delegados y disponibilidad siguen por `wcaId`; para listas de delegados usa `hasWcaId` de `@workspace/db/utils`.
- Inicio de sesión: la web es el host canónico de auth. Usa `apps/web/app/iniciar-sesion/page.tsx` y `apps/web/app/api/auth/[...all]/route.ts`. Para probar local, `BETTER_AUTH_URL` debe ser `http://localhost:3000` y el callback WCA debe ser `http://localhost:3000/api/auth/callback/wca`.
- Estilos de marca de la web: `apps/web/app/web.css`.
- Contenido editorial corto: `apps/web/lib/content.ts`.
- Delegados públicos: `apps/web/lib/delegates.ts`, renderizados dentro de `apps/web/components/about-us.tsx`.
- Competencias públicas: `apps/web/lib/competitions.ts`.
- Ranking nacional: `apps/web/lib/rankings.ts`, toma rankings nacionales de `https://api.cubingmexico.net/rank/{single|average}/{evento}` (`personId`, `personName`, `best`, `rank.country`, `stateId`) y resuelve nombres de estado con `https://api.cubingmexico.net/states`.
- Selector de categorías del ranking: usa `@cubing/icons` con clases `cubing-icon event-{eventId}` para mostrar iconos oficiales de eventos WCA en lugar de botones largos con texto.
- Assets del rediseño en `apps/web/public/source` y `apps/web/public/fonts`.

## Fuentes externas verificadas

- WordPress actual: `https://amscubing.org/`.
  - Textos usados: quienes somos. Las entradas del blog ya se importaron a `apps/blog`. Misión y visión existen como referencia editorial, pero no deben renderizarse en la portada actual.
  - Lista visible de delegados WCA.
- Competencias públicas en la web:
  - Fuente preferida: tabla `competition` en `@workspace/db` con `statusPublic = "announced"` y `endDate >= hoy` (zona `America/Mexico_City`).
  - Enrichment WCA: `https://www.worldcubeassociation.org/api/v0/competitions/{id}` para nombre, ventana de inscripción y cupo cuando haga falta.
  - Si la BD está vacía o no responde, se usa el fallback estático en `apps/web/lib/competitions.ts`.
  - WordPress legado (`events_v2.php`) ya no es la fuente de torneos de `apps/web`.
- Avatares de delegados:
  - Se usan URLs públicas de `https://avatars.worldcubeassociation.org/...` cuando existen. Algunos perfiles nuevos ya no usan la ruta antigua `/uploads/user/avatar/...`; `next.config.mjs` permite cualquier path bajo ese host.

## Datos de competencias en BD

Tabla: `competition` en `packages/db/src/schema/competitions.ts`.

Campos útiles para web:

- `name`
- `city`
- `stateId` via join con `state`
- `startDate`
- `endDate`
- `capacity`
- `statusPublic`
- `wcaCompetitionUrl`

Fallback esperado para portada cuando se lea desde BD:

- `statusPublic = "announced"`
- `endDate >= hoy`
- ordenar por `startDate` ascendente
- mostrar una lista corta y enlazar a `calendario.amscubing.org` o a `wcaCompetitionUrl` cuando exista.

## Ejecutar local

1. Instalar dependencias desde la raíz:

   ```bash
   pnpm install
   ```

2. Levantar solo la web:

   ```bash
   pnpm --filter web dev
   ```

3. Abrir:

   ```text
   http://localhost:3000
   ```

Las demás apps se levantan con `pnpm --filter <app> dev` (calendar, boards, courses, blog). Todas dependen de la web encendida para iniciar sesión.

Si no hay `DATABASE_URL` o la BD no responde, `apps/web` tiene fallback estático para delegados y torneos con contenido público/de maqueta.

## Cuidado con credenciales

Nunca guardar credenciales de WordPress, tokens ni contraseñas en el repo, en `AGENTS.md`, en commits o en logs compartidos. Si hace falta usarlas, tratarlas como secreto temporal de la sesión.
