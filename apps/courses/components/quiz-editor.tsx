"use client";
import { useState } from "react";
import type { CourseQuestion } from "@workspace/db/schema";

export function QuizEditor({ initial = [] }: { initial?: CourseQuestion[] }) {
  const [questions, setQuestions] = useState(initial);
  function update(index: number, changes: Partial<CourseQuestion>) {
    setQuestions((current) =>
      current.map((q, i) => (i === index ? { ...q, ...changes } : q)),
    );
  }
  return (
    <div>
      <input type="hidden" name="quiz" value={JSON.stringify(questions)} />
      <h3>Evaluación</h3>
      <p className="small">
        Agrega preguntas y marca las respuestas correctas. Sin preguntas, la
        lección se completa al marcarla como leída.
      </p>
      {questions.map((q, i) => (
        <div className="quiz-editor" key={q.id}>
          <div className="form-grid">
            <label className="field">
              Pregunta {i + 1}
              <input
                value={q.prompt}
                required
                onChange={(e) => update(i, { prompt: e.target.value })}
              />
            </label>
            <label className="field">
              Tipo
              <select
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
              </select>
            </label>
          </div>
          {q.type === "text" ? (
            <label className="field">
              Respuesta correcta
              <input
                value={q.answers[0] ?? ""}
                required
                onChange={(e) => update(i, { answers: [e.target.value] })}
              />
            </label>
          ) : (
            <>
              <p className="small">Selecciona todas las opciones correctas:</p>
              {q.options.map((option, j) => (
                <div className="option-edit" key={j}>
                  <input
                    aria-label={`Opción ${j + 1} correcta`}
                    type="checkbox"
                    checked={q.answers.includes(option)}
                    onChange={(e) =>
                      update(i, {
                        answers: e.target.checked
                          ? [...q.answers, option]
                          : q.answers.filter((a) => a !== option),
                      })
                    }
                  />
                  <input
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
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() =>
                    update(i, {
                      options: [...q.options, `Opción ${q.options.length + 1}`],
                    })
                  }
                >
                  Agregar opción
                </button>
              )}
            </>
          )}
          <div className="form-grid subsection">
            <label className="field">
              Puntos
              <input
                type="number"
                min="1"
                max="100"
                value={q.points}
                onChange={(e) => update(i, { points: Number(e.target.value) })}
              />
            </label>
            <div>
              <button
                type="button"
                className="text-link"
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
      <button
        className="btn secondary"
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
      </button>
    </div>
  );
}
