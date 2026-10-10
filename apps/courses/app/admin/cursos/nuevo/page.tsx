import { requireManager } from "@/lib/auth";
import { CourseEditor } from "@/components/course-editor";
import { Eyebrow, PageHeading, panelClass } from "@/components/ui";

export default async function NewCourse() {
  await requireManager();
  return (
    <section className="ams-container max-w-295 py-12">
      <div className={panelClass}>
        <Eyebrow>Equipo AMS</Eyebrow>
        <PageHeading className="mb-6">Crear curso</PageHeading>
        <CourseEditor />
      </div>
    </section>
  );
}
