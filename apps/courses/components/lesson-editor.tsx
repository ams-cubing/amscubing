import { ActionForm } from "@workspace/ui/components/action-form";
import type { courseLessons, courseModules } from "@workspace/db/schema";
import { saveLesson } from "@/app/actions";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { NativeSelect } from "@workspace/ui/components/native-select";
import { AmsField } from "@workspace/ui/components/ams-field";
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
    <ActionForm action={saveLesson}>
      <input type="hidden" name="courseId" value={courseId} />
      {lesson && <input type="hidden" name="lessonId" value={lesson.id} />}
      <AmsField label="Nombre de la lección">
        <Input
          name="title"
          required
          maxLength={200}
          defaultValue={lesson?.title}
        />{" "}
      </AmsField>
      <div className="grid gap-x-4.5 sm:grid-cols-2">
        <AmsField label="Módulo">
          <NativeSelect name="moduleId" defaultValue={lesson?.moduleId ?? ""}>
            <option value="">Sin módulo</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </NativeSelect>{" "}
        </AmsField>
        <AmsField label="Orden">
          <Input
            name="position"
            type="number"
            min={0}
            required
            defaultValue={lesson?.position ?? position}
          />{" "}
        </AmsField>
      </div>
      <AmsField label="Contenido (admite formato HTML)">
        <Textarea
          name="content"
          rows={12}
          defaultValue={lesson?.content ?? ""}
        />{" "}
      </AmsField>
      <AmsField label="Video (URL opcional)">
        <Input
          type="url"
          name="videoUrl"
          defaultValue={lesson?.videoUrl ?? ""}
        />{" "}
      </AmsField>
      <QuizEditor initial={lesson?.quiz} />
      <AmsField label="Porcentaje para aprobar" className="mt-6">
        <Input
          type="number"
          name="passPercent"
          min={0}
          max={100}
          required
          defaultValue={lesson?.passPercent ?? 80}
        />{" "}
      </AmsField>
      <AmsField label="Preguntas por intento (0 = todas)">
        <Input
          type="number"
          name="quizQuestionCount"
          min={0}
          max={100}
          required
          defaultValue={lesson?.quizQuestionCount ?? 0}
        />{" "}
      </AmsField>
      <Submit>Guardar lección</Submit>
    </ActionForm>
  );
}
