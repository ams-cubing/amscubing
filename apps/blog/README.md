# Blog AMS

CMS del blog en Next.js y PostgreSQL. Comparte cuentas y sesión con la web,
Calendario, Tableros y Cursos. Sus permisos editoriales son independientes.

```sh
pnpm install
pnpm db:up
pnpm db:migrate
pnpm --filter web dev
pnpm --filter blog dev
```

Abrir http://localhost:3004. La gestión vive en `/admin` y el editor en
`/admin/entradas/nueva`. Configurar las URLs de las cinco apps, el mismo
`BETTER_AUTH_SECRET` y la BD en sus `.env.local`.

## Editor y permisos

Secciones con una, dos o tres columnas; bloques de título, texto, imagen, cita,
video, botón y separador; plantillas de guía e historia; arrastrar para reordenar
secciones o mover bloques entre secciones. Las flechas permiten ordenar con
teclado o en móvil. Hay vista previa, borradores, publicación, archivo, categorías,
etiquetas, imágenes, moderación y control de versiones para evitar sobrescribir
ediciones concurrentes.

La paleta está limitada a azul, rojo, verde y naranja AMS, blanco y gris claro.
Gaming Sporty, Unbounded y Saira se controlan desde la app. La validación del
servidor rechaza fuentes, colores y propiedades arbitrarias, elimina estilos de
WordPress y sanitiza texto enriquecido, enlaces y videos. No ejecuta plugins ni
código de WordPress/Elementor. El contenido importado se edita visualmente.

`blog_staff` admite `administrator`, `developer` y `editor`. Administradores y
desarrolladores pueden asignar o retirar permisos de Blog a cuentas con correo
verificado desde `/admin/permisos` en la web; editores gestionan entradas y comentarios. Los delegados también
pueden gestionar contenido. El rol editorial global antiguo no concede acceso
automáticamente. `course_staff` permanece separado: ningún permiso de Blog
concede permisos de Cursos ni viceversa.

Bootstrap local para una cuenta existente y verificada:

```sh
pnpm --filter blog staff:grant <user-id> developer
```

## Migración de WordPress

El importador consume snapshots de la API REST pública de WordPress en una
carpeta privada: `posts.json` (con `_embed`), `categories.json` y `comments.json`.
Solo se importan entradas publicadas y comentarios públicos aprobados. Los
archivos de origen, credenciales y reportes no se versionan.

```sh
pnpm --filter blog import:wordpress ../../.codex/migration/blog
```

La migración local tiene tres entradas, cuatro comentarios y 28 imágenes.
Conserva fechas, texto, enlaces y medios; convierte los desplegables de WordPress
en secciones con títulos y las galerías en columnas. Actualiza resúmenes y estilo
para AMS y abre comentarios con moderación previa. Usa IDs legados para no duplicar
datos; al guardar una entrada localmente deja de sobrescribirla en reimportaciones.
También conserva las decisiones locales de moderación.

Las imágenes migradas están en `public/media/wordpress`. Las cargas nuevas del
editor (portada e imágenes de bloques) se suben a UploadThing mediante
`/api/uploadthing` (ruta `blogImage` en `lib/uploadthing.ts`) y se guardan como
URL pública. Requiere `UPLOADTHING_TOKEN`; solo el staff con permiso de edición
puede subir, con imágenes de hasta 8 MB y un máximo de 30 cargas cada 10 minutos
por usuario (`@workspace/db/rate-limit`).

## Cuentas con correo y WCA

La web en el puerto 3000 es el host canónico de registro, acceso, recuperación y
vinculación WCA. Las cuentas locales pueden tomar cursos; para comentar o reclamar
historial legado deben verificar el correo. Desde `/cuenta` pueden vincular WCA,
incluso si tiene otro correo, conservando su usuario AMS, cursos y permisos.
La vinculación usa OAuth y rechaza una identidad WCA ya vinculada a otra cuenta.

Producción requiere `RESEND_API_KEY` y el remitente `no-reply@amscubing.org`
verificado en Resend para verificación y recuperación. En desarrollo, si no hay
Resend, los enlaces quedan en `.codex/dev-mail`: el enlace de verificación se
abre desde la cuenta autenticada mediante «Verificar correo». Este endpoint solo
entrega el enlace del propio usuario y está deshabilitado en producción. Los
enlaces de recuperación locales se conservan en esa carpeta privada.

Los comentarios requieren correo verificado y moderación antes de mostrarse.
Los límites de autenticación, comentarios y cargas se guardan en PostgreSQL.

## Verificación

```sh
pnpm --filter blog test
pnpm check-types
pnpm --filter blog build
pnpm --filter blog exec tsx scripts/smoke-local.ts
pnpm --filter blog exec tsx scripts/smoke-wca-link.ts
```

La primera prueba funcional necesita web, Cursos y Blog encendidos. Comprueba
registro real, verificación, separación de permisos, comentarios, borradores,
marca, ediciones concurrentes y acceso a cursos sin WCA. La segunda simula los
endpoints WCA y prueba el callback OAuth real de Better Auth sin enviar datos
a WCA. Ambas crean y limpian únicamente sus propios datos temporales.
