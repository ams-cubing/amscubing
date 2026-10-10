# Cursos AMS

Next.js en el puerto 3003, con PostgreSQL compartido y sesión WCA emitida por
`apps/web` en el puerto 3000. Diseño basado en el header compartido, recursos de
`apps/web` y el manual de identidad AMS: Gaming Sporty, Unbounded y Saira.

## Desarrollo

Desde la raíz: `pnpm db:up`, `pnpm db:migrate`, `pnpm --filter web dev` y, en otra
terminal, `pnpm --filter courses dev`. Copiar `.env.local.example` a `.env.local`
y usar el mismo `BETTER_AUTH_SECRET` que la web. La base de datos es obligatoria.

## Funcionalidad

- Catálogo de cursos publicados, inscripción WCA y página Mi aprendizaje.
- Módulos y lecciones ordenadas con contenido HTML sanitizado, imágenes y videos.
- Preguntas de opción múltiple, verdadero/falso y respuesta corta; calificación
  en servidor y umbral de aprobación configurable. Banco de preguntas con
  selección aleatoria por intento y formulario firmado por alumno/lección.
- Progreso por usuario, historial de intentos y finalización de cursos.
- Panel `/admin`: cursos, módulos, lecciones, evaluaciones y alumnos. Los
  permisos se asignan desde `/admin/permisos` en la web.
- Publicación, borradores y archivado. Borradores nunca accesibles a alumnos.

## Permisos

Los roles globales siguen siendo `user`, `delegate` y `editor`.
`course_staff` agrega permisos limitados a Cursos:

| Permiso                 | Gestionar cursos | Asignar permisos |
| ----------------------- | ---------------- | ---------------- |
| Delegado AMS            | Sí               | No               |
| Instructor              | Sí               | No               |
| Administrador           | Sí               | Sí               |
| Desarrollador           | Sí               | Sí               |
| Alumno / editor de blog | No               | No               |

Todas las acciones verifican sesión y permisos en servidor. Para asignar el
primer administrador o desarrollador, después de su primer login WCA:

```sh
pnpm --filter courses staff:grant correo@example.com developer
```

No se importan roles ni contraseñas de WordPress. Las personas sin WCA ID pueden
tomar cursos con su cuenta WCA.

## Migración del curso AMS desde Sensei

Usar las herramientas oficiales de WordPress/Sensei para descargar:

1. Export Content: cursos, lecciones y preguntas (ZIP con tres CSV).
2. Reports: todos los alumnos (`user-overview.csv`).
3. Reports > Capacitación de Staff > alumnos
   (`capacitacion-de-staff-users-overview.csv`).
4. Un reporte de alumnos por cada lección y `lesson-reports.json` con objetos
   `{ "lessonId": 209, "file": "que-es-la-wca-y-la-ams-learners-overview.csv" }`.

Conservar estos archivos dentro de `.codex/migration/sensei`, excluido de Git.
El importador selecciona el curso publicado 206, conserva el orden original y
descarta las copias de respaldo y lecciones no asociadas. Detecta duplicados
inconsistentes, lecciones faltantes e identidades ambiguas.

```sh
pnpm --filter courses exec tsx scripts/migrate-media.ts ../../.codex/migration/sensei
pnpm --filter courses import:sensei ../../.codex/migration/sensei
```

La importación corre en una transacción y se puede repetir sin duplicar datos.
Una repetición actualiza el contenido importado desde WordPress, por lo que debe
hacerse antes de editar ese contenido en el nuevo panel.

Los historiales se conservan en `course_legacy_student` y `course_legacy_record`.
Cuando un alumno inicia sesión, su correo verificado se vincula al historial,
sin transferir contraseñas ni crear cuentas con acceso falso. Los nombres de
los reportes por lección solo se resuelven cuando corresponden a una identidad
única del export de alumnos. Cualquier excepción queda en `unresolved.json`.

La copia local verificada contiene: 1 curso, 7 módulos, 39 lecciones, 66 preguntas,
220 identidades, 216 inscripciones (186 completadas) y 7,442 registros por lección.
El resumen está en `import-summary.json`. Incluye referencias a certificados
históricos; los documentos originales de WordPress se conservan como referencias.

## Puntuaciones y certificados AMS

La página del curso, Mis cursos y la lista de alumnos en administración muestran
la puntuación final sobre 100: promedio con el mismo peso de las notas guardadas
de las evaluaciones aprobadas. Las lecturas no afectan la nota. Si falta una
calificación requerida, se muestra "Puntuación no disponible"; los cursos sin
evaluaciones muestran "Sin evaluación numérica".

Al finalizar un curso se guarda un certificado con nombre, título del curso,
fecha de finalización, puntuación y folio único en `course_enrollment.certificate`.
La descarga `/cursos/[slug]/certificado` requiere sesión y la inscripción
completada de esa misma cuenta; los permisos administrativos no permiten descargar
certificados de otros alumnos. El PDF conserva los datos de su primera emisión,
incluso si después cambia el nombre o se edita el curso.

Los alumnos con historial importado completo también pueden descargar un nuevo
certificado AMS. Se emite al descargarlo por primera vez, utilizando las notas
disponibles; no se inventan notas ni se reemplazan los certificados históricos.

Antes de desplegar esta versión, ejecutar `pnpm --filter @workspace/db db:migrate`
con la conexión de producción (migración 0038). El PDF utiliza los logos locales,
Gaming Sporty y Saira; la licencia OFL de Saira está en `public/fonts/Saira-OFL.txt`.

Los medios del curso se copian a `public/media/wordpress`. El MP4 de 123 MiB está
excluido de Git por tamaño: para despliegue, copiarlo a almacenamiento persistente
o CDN y actualizar sus URLs. Conservar también una copia segura de los exports
fuera del repositorio. Los videos de YouTube mantienen sus enlaces originales.

## Verificación

```sh
pnpm --filter courses test
pnpm --filter courses check-types
pnpm --filter courses build
pnpm --filter courses exec tsx scripts/smoke-local.ts
```

La prueba completa requiere Cursos encendido en el puerto 3003. Crea usuarios,
sesiones y cursos temporales para comprobar permisos, inscripción, evaluaciones,
finalización y vinculación verificada. Elimina únicamente sus propios datos al
terminar; nunca imprime tokens ni credenciales.
