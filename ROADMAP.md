# Roadmap

Living plan for the AMS Cubing monorepo. Items move between phases as we ship.

## Principles

- One identity: WCA sign-in via Better Auth, shared `ams.*` cookies across `*.amscubing.org`.
- Web (`apps/web`) becomes the public home and content platform; calendar and boards stay domain-focused.
- Prefer shared packages (`@workspace/db`, `@workspace/auth`, `@workspace/ui`) over duplicating logic.

---

## Now / Near-term

### Auth on the web app

- [ ] Move the canonical Better Auth host from calendar → **web** (`amscubing.org` / port 3000).
- [ ] Update `@workspace/auth` (`getAuthBaseUrl`, trusted origins, cookie domain) so web, calendar, and boards share sessions.
- [ ] Point WCA OAuth redirect URIs at the web app; keep calendar/boards as cookie consumers only.
- [ ] Sign-in / sign-out UX on web; deep-links back to calendar and boards after login.
- [ ] Document env vars (`BETTER_AUTH_URL`, `NEXT_PUBLIC_*`, `AUTH_COOKIE_DOMAIN`) for all three apps.

### Web as replacement for amscubing.org

Parity with the current WordPress site, then retire it.

**Public**

- [ ] Blog: list, post detail, categories/tags, SEO (titles, OG, sitemap).
- [ ] Comments on posts (auth required or moderated guest — decide).
- [ ] Courses: catalog, course detail, levels/modules (e.g. Capacitación de Staff).
- [ ] Progress / enrollment for signed-in users.
- [ ] Keep misión, visión, delegados, and contacto in sync with CMS or DB where needed.
- [ ] Redirects from old WordPress URLs → new Next.js routes.

**Admin / management (panel on web)**

- [ ] CRUD blog posts (draft/publish, rich text or MDX, cover image via Blob or similar).
- [ ] Moderate comments.
- [ ] CRUD courses, modules, lessons; publish/unpublish.
- [ ] Role checks (delegate / content editor — extend roles if needed).
- [ ] Media library / uploads.

**Data**

- [ ] Schema in `@workspace/db`: `post`, `post_comment`, `course`, `course_module`, `enrollment` (names TBD).
- [ ] Migrations + seed from existing WordPress content if migrating history.

---

## Next

### Calendar & boards product depth

- [ ] Holidays / calendar polish already in flight.
- [ ] Cross-app nav: consistent account menu linking web ↔ calendar ↔ boards.
- [ ] Optional: surface upcoming comps / course CTAs on web from shared DB (no hardcoded teasers).

### Platform

- [ ] Shared session helpers used by all apps (pattern from calendar `lib/session`).
- [ ] CI: typecheck, lint, tests per app; DB migrate in preview if needed.
- [ ] Production DNS: apex `amscubing.org` → web; keep `calendario.*` / `tablero.*`.

---

## Later

- [ ] Decommission WordPress once redirects + content parity are verified.
- [ ] Course certificates / completion badges.
- [ ] Newsletter or announcement digests.
- [ ] Public API or RSS for blog.
- [ ] Stronger RBAC (content editor vs delegate vs admin).

---

## Out of scope (for now)

- Replacing WCA as identity provider.
- Merging calendar + boards into a single deployable.

---

## Decision log

| Date | Decision | Notes |
| ---- | -------- | ----- |
| TBD | Auth host = web | Calendar stops owning OAuth callbacks |
| TBD | CMS approach | DB + admin UI vs MDX files — prefer DB for comments/courses |
