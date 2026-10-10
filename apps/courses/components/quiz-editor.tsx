"use client";
import { useState } from "react";
import type { CourseQuestion } from "@workspace/db/schema";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { NativeSelect } from "@workspace/ui/components/native-select";
import { AmsField } from "@workspace/ui/components/ams-field";
import { smallClass, textLinkClass } from "./ui";

export function QuizEditor({ initial = [] }: { initial?: CourseQuestion[] }) {
  const [questions, setQuestions] = useState(initial);
  function update(index: number, changes: Partial<CourseQuestion>) {
    setQuestions((current) =>
      current.map((q, i) => (i === index ? { ...q, ...changes } : q)),
    );
  }
  return (
    <div className="mt-8 border-t border-ams-navy/10 pt-7">
      <input type="hidden" name="quiz" value={JSON.stringify(questions)} />
      <h3 className="ams-heading mb-2 text-xl font-bold">Evaluación</h3>
      <p className={`${smallClass} mb-5`}>
        Agrega preguntas y marca las respuestas correctas. Sin preguntas, la
        lección se completa al marcarla como leída.
      </p>
      {questions.map((q, i) => (
        <div
          className="mb-4.5 rounded-2xl border border-ams-navy/10 bg-ams-soft p-5"
          key={q.id}
        >
          <div className="grid gap-x-4.5 sm:grid-cols-2">
            <AmsField label={`Pregunta ${i + 1}`}>
              <Input
                value={q.prompt}
                required
                onChange={(e) => update(i, { prompt: e.target.value })}
              />{" "}
            </AmsField>
            <AmsField label="Tipo">
              <NativeSelect
                value={q.type}
                onChange={(e) =>
                  update(i, {
                    type: e.target.value as CourseQuestion["type"],
                    options:
                      e.target.value === "boolean"
                        ? ["Verdadero", "Falso"]
                        : e.target.value === "text"
                          ? []
                          : ["Opción 1", "Opción 2"],
                    answers: [],
                  })
                }
              >
                <option value="choice">Selección de respuestas</option>
                <option value="boolean">Verdadero o falso</option>
                <option value="text">Respuesta corta</option>
              </NativeSelect>{" "}
            </AmsField>
          </div>
          {q.type === "text" ? (
            <AmsField label="Respuesta correcta">
              <Input
                value={q.answers[0] ?? ""}
                required
                onChange={(e) => update(i, { answers: [e.target.value] })}
              />{" "}
            </AmsField>
          ) : (
            <>
              <p className={`${smallClass} mb-2`}>
                Selecciona todas las opciones correctas:
              </p>
              {q.options.map((option, j) => (
                <div className="mb-2.5 flex items-center gap-2.5" key={j}>
                  <input
                    aria-label={`Opción ${j + 1} correcta`}
                    type="checkbox"
                    className="size-4.5 shrink-0 accent-ams-red"
                    checked={q.answers.includes(option)}
                    onChange={(e) =>
                      update(i, {
                        answers: e.target.checked
                          ? [...q.answers, option]
                          : q.answers.filter((a) => a !== option),
                      })
                    }
                  />
                  <Input
                    aria-label={`Texto opción ${j + 1}`}
                    type="text"
                    value={option}
                    required
                    onChange={(e) =>
                      update(i, {
                        options: q.options.map((o, k) =>
                          k === j ? e.target.value : o,
                        ),
                        answers: q.answers.map((a) =>
                          a === option ? e.target.value : a,
                        ),
                      })
                    }
                  />
                </div>
              ))}
              {q.type === "choice" && (
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() =>
                    update(i, {
                      options: [...q.options, `Opción ${q.options.length + 1}`],
                    })
                  }
                >
                  Agregar opción
                </Button>
              )}
            </>
          )}
          <div className="mt-5 grid items-end gap-x-4.5 sm:grid-cols-2">
            <AmsField label="Puntos">
              <Input
                type="number"
                min="1"
                max="100"
                value={q.points}
                onChange={(e) => update(i, { points: Number(e.target.value) })}
              />{" "}
            </AmsField>
            <div className="mb-4">
              <button
                type="button"
                className={textLinkClass}
                onClick={() =>
                  setQuestions((current) => current.filter((_, j) => j !== i))
                }
              >
                Quitar pregunta
              </button>
            </div>
          </div>
        </div>
      ))}
      <Button
        variant="outline"
        type="button"
        onClick={() =>
          setQuestions((current) => [
            ...current,
            {
              id: crypto.randomUUID(),
              prompt: "",
              type: "choice",
              options: ["Opción 1", "Opción 2"],
              answers: [],
              points: 1,
            },
          ])
        }
      >
        + Agregar pregunta
      </Button>
    </div>
  );
}
