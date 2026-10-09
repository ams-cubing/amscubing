import { requireManager } from "@/lib/auth";
import { CourseEditor } from "@/components/course-editor";
export default async function NewCourse() {
  await requireManager();
  return (
    <section className="shell section">
      <div className="panel">
        <span className="eyebrow">Equipo AMS</span>
        <h1>Crear curso</h1>
        <CourseEditor />
      </div>
    </section>
  );
}
