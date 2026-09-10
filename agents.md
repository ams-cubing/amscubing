# AMS Cubing - Contexto Para Agentes

## Objetivo actual

El foco inmediato es `apps/web`: convertirla en el reemplazo público de `amscubing.org`, usando el diseño nuevo recibido en `C:\Users\PCE1\Downloads\Web AMS\Web AMS` y complementando contenido faltante desde el WordPress actual.

La home debe seguir la estructura visual de `index.html` en la propuesta de Descargas: hero, próximos torneos, ranking nacional, bloque breve de sobre nosotros, comunidad/testimonios, CTA y footer. No meter la página completa de Nosotros debajo del ranking. Header y footer deben mantener las secciones del diseño original: Home, Nosotros, Torneos, Blog y Cursos.

`/nosotros` es una página aparte basada en `nosotros.html` de la propuesta de Descargas. Ahí viven misión, visión, objetivos, planes, delegados WCA con foto/enlace oficial y momentos de comunidad.

La rama de trabajo para esta pasada es `codex/ams-web-redesign`.

## Roadmap relevante

- `apps/web` será la casa pública: portada, página Nosotros, blog, delegados, contacto y enlaces a calendario/cursos. En la portada actual no se muestran misión ni visión porque pertenecen a `/nosotros`.
- `apps/calendar` sigue siendo dueño del ciclo de vida de competencias.
- La web solo debe leer competencias públicas con `competition.statusPublic = "announced"` y fechas futuras.
- Los cursos no se reconstruyen dentro de `apps/web`; se enlazan a `cursos.amscubing.org`.
- WordPress queda como fuente de paridad de portada/blog mientras se migra contenido.
- No crear backend de formulario público sin resolver rate limiting y estrategia de envío.

## Arquitectura rápida

- Monorepo pnpm + Turbo.
- Apps:
  - `apps/web`: sitio público Next.js.
  - `apps/calendar`: calendario y panel de competencias.
  - `apps/boards`: tableros de organización.
- Paquetes:
  - `@workspace/db`: Drizzle, schema y datos compartidos.
  - `@workspace/auth`: Better Auth y helpers de sesión.
  - `@workspace/ui`: componentes UI compartidos. Chrome global AMS (`AmsSiteNav` + `AmsAccountMenu`) vive aquí; Competencias es ruta de `apps/web` (`/competencias`) con enlace al calendario.

## Web actual

- Página principal: `apps/web/app/page.tsx`.
- Página Nosotros: `apps/web/app/nosotros/page.tsx`.
- Página Torneos: `apps/web/app/competencias/page.tsx`, lee competencias anunciadas desde `@workspace/db` y enriquece datos faltantes con la API WCA mediante `apps/web/lib/competitions.ts`. Incluye CTA a `getCalendarUrl()` para el calendario completo.
- Página Blog: `apps/web/app/blog/page.tsx`, muestra entradas editoriales enlazadas desde `apps/web/lib/content.ts`.
- Página Cursos: `apps/web/app/cursos/page.tsx`, conserva la funcionalidad como entrada al sitio externo `cursos.amscubing.org`.
- Página Cuenta: `apps/web/app/cuenta/page.tsx`, usa la sesión compartida de `@workspace/auth` con WCA ID y funciona como hub de acciones. Usuarios generales ven mis competencias, blog y cursos; delegados ven además crear competencias, tableros, blog editorial y cursos. El schema actual solo distingue `user` y `delegate`; RBAC editorial fino queda pendiente.
- Inicio de sesión: la web es el host canónico de auth. Usa `apps/web/app/iniciar-sesion/page.tsx` y `apps/web/app/api/auth/[...all]/route.ts`. Para probar local, `BETTER_AUTH_URL` debe ser `http://localhost:3000` y el callback WCA debe ser `http://localhost:3000/api/auth/callback/wca`.
- Estilos de marca de la web: `apps/web/app/web.css`.
- Contenido editorial corto: `apps/web/lib/content.ts`.
- Delegados públicos: `apps/web/lib/delegates.ts`, renderizados dentro de `apps/web/components/quienes-somos.tsx`.
- Competencias públicas: `apps/web/lib/competitions.ts`.
- Ranking nacional: `apps/web/lib/rankings.ts`, toma rankings nacionales de `https://api.cubingmexico.net/rank/{single|average}/{evento}` (`personId`, `personName`, `best`, `rank.country`, `stateId`) y resuelve nombres de estado con `https://api.cubingmexico.net/states`.
- Selector de categorías del ranking: usa `@cubing/icons` con clases `cubing-icon event-{eventId}` para mostrar iconos oficiales de eventos WCA en lugar de botones largos con texto.
- Assets del rediseño copiados a `apps/web/public/source` y `apps/web/public/fonts`.

## Fuentes externas verificadas

- WordPress actual: `https://amscubing.org/`.
  - Textos usados: quienes somos y blog destacado. Misión y visión existen como referencia editorial, pero no deben renderizarse en la portada actual.
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

Si no hay `DATABASE_URL` o la BD no responde, `apps/web` tiene fallback estático para delegados y torneos con contenido público/de maqueta.

## Cuidado con credenciales

Nunca guardar credenciales de WordPress, tokens ni contraseñas en el repo, en `agents.md`, en commits o en logs compartidos. Si hace falta usarlas, tratarlas como secreto temporal de la sesión.
