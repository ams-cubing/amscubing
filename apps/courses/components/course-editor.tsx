import { saveCourse } from "@/app/actions";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { NativeSelect } from "@workspace/ui/components/native-select";
import { AmsField } from "@workspace/ui/components/ams-field";
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
      <div className="grid gap-x-4.5 sm:grid-cols-2">
        <AmsField label="Nombre del curso">
          <Input
            name="title"
            required
            maxLength={200}
            defaultValue={course?.title}
          />{" "}
        </AmsField>
        <AmsField label="Enlace del curso">
          <Input
            name="slug"
            required
            maxLength={200}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            placeholder="capacitacion-de-staff"
            defaultValue={course?.slug}
          />{" "}
        </AmsField>
      </div>
      <AmsField label="Descripción (admite formato HTML)">
        <Textarea
          name="description"
          required
          rows={6}
          defaultValue={course?.description}
        />{" "}
      </AmsField>
      <div className="grid gap-x-4.5 sm:grid-cols-2">
        <AmsField label="Imagen de portada (URL)">
          <Input
            name="coverUrl"
            type="url"
            defaultValue={course?.coverUrl ?? ""}
          />{" "}
        </AmsField>
        <AmsField label="Disponibilidad">
          <NativeSelect name="status" defaultValue={course?.status ?? "draft"}>
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
            <option value="archived">Archivado</option>
          </NativeSelect>{" "}
        </AmsField>
      </div>
      <Submit>Guardar curso</Submit>
    </form>
  );
}
