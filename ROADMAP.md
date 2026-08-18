# Roadmap

Living plan for the AMS Cubing monorepo. Items move between phases as we ship.

## Principles

- One identity: WCA sign-in via Better Auth, shared `ams.*` cookies across `*.amscubing.org`.
- Domain-focused apps: web is the public home; calendar owns competitions; boards own org work; courses stay their own product (WordPress now, an app later).
- Prefer shared packages (`@workspace/db`, `@workspace/auth`, `@workspace/ui`) over duplicating logic.
- Web **reads** shared data (delegates, announced competitions). It does not own those lifecycles.

---

## Now / Near-term

### Auth on the web app

- [ ] Move the canonical Better Auth host from calendar → **web** (`amscubing.org` / port 3000).
- [ ] Update `@workspace/auth` (`getAuthBaseUrl`, trusted origins, cookie domain) so web, calendar, and boards share sessions.
- [ ] Point WCA OAuth redirect URIs at the web app; keep calendar/boards as cookie consumers only.
- [ ] Sign-in / sign-out UX on web; deep-links back to calendar and boards after login.
- [ ] Document env vars (`BETTER_AUTH_URL`, `NEXT_PUBLIC_*`, `AUTH_COOKIE_DOMAIN`) for all three apps.

### Web as replacement for amscubing.org

Parity with the current WordPress **homepage and blog**, then retire WordPress from the apex. Courses stay on a subdomain (see below).

**Public**

- [ ] Upcoming competitions on web from `@workspace/db`: `statusPublic = announced`, future dates, small list + link to `calendario.*`. Same pattern as delegates (`getPublicDelegates`).
- [ ] Blog: list, post detail, categories/tags, SEO (titles, OG, sitemap).
- [ ] Comments on posts (auth required or moderated guest — decide).
- [ ] Keep misión, visión, delegados, and contacto in sync with CMS or DB where needed.
- [ ] Nav / teaser link to `cursos.amscubing.org` (do not rebuild the LMS on web).
- [ ] Redirects from old WordPress URLs → new Next.js routes (and `/detalle-cursos/` → `cursos.*`).

**Admin / management (panel on web)**

- [ ] CRUD blog posts (draft/publish, rich text or MDX, cover image via Blob or similar).
- [ ] Moderate comments.
- [ ] Role checks (delegate / content editor — extend roles if needed).
- [ ] Media library / uploads.

**Data**

- [ ] Schema in `@workspace/db`: `post`, `post_comment` (names TBD). No course tables until we migrate off WordPress.
- [ ] Migrations + seed from existing WordPress **blog** content if migrating history.

### Isolate courses on WordPress

Leave the existing LMS plugin running; stop serving it from the apex.

- [ ] Host the plugin only at `cursos.amscubing.org`.
- [ ] Apex `amscubing.org` → `apps/web`; keep `calendario.*` / `tablero.*`.
- [ ] Confirm login/progress on the plugin still works on the subdomain.

Calendar remains the system of record for competitions. Setting **Anunciada** is what makes a comp appear on the web. No extra “public for website” flag.

---

## Next

### Calendar & boards product depth

- [ ] Holidays / calendar polish already in flight.
- [ ] Cross-app nav: consistent account menu linking web ↔ calendar ↔ boards (and cursos).

### Platform

- [ ] Shared session helpers used by all apps (pattern from calendar `lib/session`).
- [ ] CI: typecheck, lint, tests per app; DB migrate in preview if needed.

---

## Later

- [ ] Decommission WordPress **blog/homepage** once redirects + content parity are verified. Keep `cursos.*` until the LMS is replaced.
- [ ] Courses app in the monorepo (`apps/courses` or similar): catalog, modules, enrollment, shared `ams.*` cookies. Schema (`course`, `course_module`, `enrollment`) lands then.
- [ ] Course certificates / completion badges.
- [ ] Optional: dedicated **Anunciar** action that drafts (or later posts) social copy from name, city, dates, WCA URL. Do not auto-post on every status save. Store `announcedAt` / post ids to avoid duplicates. Board card “Publicación FB Torneo de Rubik” stays the human checklist.
- [ ] Newsletter or announcement digests.
- [ ] Public API or RSS for blog.
- [ ] Stronger RBAC (content editor vs delegate vs admin).

---

## Out of scope (for now)

- Replacing WCA as identity provider.
- Merging calendar + boards into a single deployable.
- Rebuilding the LMS inside `apps/web`.
- Auto-posting to Facebook/Instagram when a competition is saved as announced.

---

## Decision log

| Date | Decision | Notes |
| ---- | -------- | ----- |
| TBD | Auth host = web | Calendar stops owning OAuth callbacks |
| TBD | CMS approach | DB + admin UI vs MDX files — prefer DB for blog/comments |
| 2026-08-18 | Courses stay off web | WordPress LMS on `cursos.amscubing.org` first; later a dedicated app, not `apps/web` |
| 2026-08-18 | Web comps = `announced` | Calendar owns lifecycle; web only lists future `statusPublic = announced` rows |
| 2026-08-18 | Social ≠ status change | Showing on the site is a DB read; posting to AMS social is a later, explicit action |
