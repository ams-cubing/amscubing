import { saveCourse } from "@/app/actions";
import { Submit } from "./submit";
import type { courses } from "@workspace/db/schema";

export function CourseEditor({
  course,
}: {
  course?: typeof courses.$inferSelect;
}) {
  return (
    <form action={saveCourse}>
      {course && <input type="hidden" name="courseId" value={course.id} />}
      <div className="form-grid">
        <label className="field">
          Nombre del curso
          <input
            name="title"
            required
            maxLength={200}
            defaultValue={course?.title}
          />
        </label>
        <label className="field">
          Enlace del curso
          <input
            name="slug"
            required
            maxLength={200}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            placeholder="capacitacion-de-staff"
            defaultValue={course?.slug}
          />
        </label>
      </div>
      <label className="field">
        Descripción (admite formato HTML)
        <textarea
          name="description"
          required
          rows={6}
          defaultValue={course?.description}
        />
      </label>
      <div className="form-grid">
        <label className="field">
          Imagen de portada (URL)
          <input
            name="coverUrl"
            type="url"
            defaultValue={course?.coverUrl ?? ""}
          />
        </label>
        <label className="field">
          Disponibilidad
          <select name="status" defaultValue={course?.status ?? "draft"}>
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
            <option value="archived">Archivado</option>
          </select>
        </label>
      </div>
      <Submit>Guardar curso</Submit>
    </form>
  );
}
