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

### Plataforma

- [ ] Helpers de sesión compartidos usados por todas las apps (patrón de `lib/session` del calendario).
- [ ] CI: typecheck, lint, tests por app; migrar la BD en preview si hace falta.

---

## Después

- [ ] Dar de baja WordPress de **blog/portada** cuando las redirecciones y la paridad de contenido estén verificadas. Conservar `cursos.*` hasta reemplazar el LMS.
- [ ] App de cursos en el monorepo (`apps/courses` o similar): catálogo, módulos, inscripción, cookies `ams.*` compartidas. El esquema (`course`, `course_module`, `enrollment`) llega entonces.
- [ ] Certificados de curso / insignias de finalización.
- [ ] Opcional: acción dedicada **Anunciar** que redacte (o más adelante publique) el texto para redes a partir de nombre, ciudad, fechas y URL de la WCA. No auto-publicar en cada guardado de estatus. Guardar `announcedAt` / ids de posts para evitar duplicados. La tarjeta del tablero “Publicación FB Torneo de Rubik” sigue siendo la checklist humana.
- [ ] Newsletter o resúmenes de anuncios.
- [ ] API pública o RSS del blog.
- [ ] RBAC más fuerte (editor de contenido vs delegado vs admin).

---

## Fuera de alcance (por ahora)

- Reemplazar a la WCA como proveedor de identidad.
- Fusionar calendario + tableros en un solo deployable.
- Reconstruir el LMS dentro de `apps/web`.
- Auto-publicar en Facebook/Instagram al guardar una competencia como anunciada.

---

## Registro de decisiones

| Fecha      | Decisión                    | Notas                                                                                                    |
| ---------- | --------------------------- | -------------------------------------------------------------------------------------------------------- |
| TBD        | Host de auth = web          | El calendario deja de ser dueño de los callbacks de OAuth                                                |
| TBD        | Enfoque de CMS              | BD + UI de admin vs archivos MDX — preferir BD para blog/comentarios                                     |
| 2026-08-18 | Los cursos no van en la web | LMS de WordPress en `cursos.amscubing.org` primero; después una app dedicada, no `apps/web`              |
| 2026-08-18 | Comps en web = `announced`  | El calendario es dueño del ciclo de vida; la web solo lista filas futuras con `statusPublic = announced` |
| 2026-08-18 | Redes ≠ cambio de estatus   | Mostrar en el sitio es una lectura de BD; publicar en redes de AMS es una acción posterior y explícita   |
