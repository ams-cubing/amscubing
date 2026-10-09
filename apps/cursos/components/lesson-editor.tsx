import type { courseLessons, courseModules } from "@workspace/db/schema";
import { saveLesson } from "@/app/actions";
import { Submit } from "./submit";
import { QuizEditor } from "./quiz-editor";

export function LessonEditor({
  courseId,
  modules,
  lesson,
  position,
}: {
  courseId: number;
  modules: (typeof courseModules.$inferSelect)[];
  lesson?: typeof courseLessons.$inferSelect;
  position: number;
}) {
  return (
    <form action={saveLesson}>
      <input type="hidden" name="courseId" value={courseId} />
      {lesson && <input type="hidden" name="lessonId" value={lesson.id} />}
      <label className="field">
        Nombre de la lección
        <input
          name="title"
          required
          maxLength={200}
          defaultValue={lesson?.title}
        />
      </label>
      <div className="form-grid">
        <label className="field">
          Módulo
          <select name="moduleId" defaultValue={lesson?.moduleId ?? ""}>
            <option value="">Sin módulo</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Orden
          <input
            name="position"
            type="number"
            min={0}
            required
            defaultValue={lesson?.position ?? position}
          />
        </label>
      </div>
      <label className="field">
        Contenido (admite formato HTML)
        <textarea
          name="content"
          rows={12}
          defaultValue={lesson?.content ?? ""}
        />
      </label>
      <label className="field">
        Video (URL opcional)
        <input
          type="url"
          name="videoUrl"
          defaultValue={lesson?.videoUrl ?? ""}
        />
      </label>
      <QuizEditor initial={lesson?.quiz} />
      <label className="field subsection">
        Porcentaje para aprobar
        <input
          type="number"
          name="passPercent"
          min={0}
          max={100}
          required
          defaultValue={lesson?.passPercent ?? 80}
        />
      </label>
      <label className="field">
        Preguntas por intento (0 = todas)
        <input
          type="number"
          name="quizQuestionCount"
          min={0}
          max={100}
          required
          defaultValue={lesson?.quizQuestionCount ?? 0}
        />
      </label>
      <Submit>Guardar lección</Submit>
    </form>
  );
}
