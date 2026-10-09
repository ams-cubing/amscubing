import { describe, expect, it } from "vitest";
import { calculateCourseScore, formatCourseScore } from "./course-score";

describe("puntuación global", () => {
  const lessons = [
    { id: 1, quiz: [{}] },
    { id: 2, quiz: [{}] },
    { id: 3, quiz: [] },
  ];
  it("promedia evaluaciones sin asignar nota a lecturas", () => {
    expect(
      calculateCourseScore(lessons, [
        { lessonId: 1, score: 80 },
        { lessonId: 2, score: 100 },
        { lessonId: 3, score: null },
      ]),
    ).toEqual({ score: 90, scoreStatus: "scored" });
  });
  it("no inventa notas para evaluaciones sin historial", () => {
    expect(
      calculateCourseScore(lessons, [{ lessonId: 1, score: 100 }]).scoreStatus,
    ).toBe("unavailable");
  });
  it("conserva notas históricas aunque ya no haya preguntas", () => {
    expect(
      calculateCourseScore([{ id: 1, quiz: [] }], [{ lessonId: 1, score: 84 }])
        .score,
    ).toBe(84);
  });
  it("no transforma un curso de lecturas en 100 puntos", () => {
    expect(
      formatCourseScore(
        calculateCourseScore(
          [{ id: 1, quiz: [] }],
          [{ lessonId: 1, score: null }],
        ),
      ),
    ).toBe("Sin evaluación numérica");
  });
  it("incluye cero y rechaza datos inválidos o de otro curso", () => {
    expect(
      calculateCourseScore(
        [{ id: 1, quiz: [{}] }],
        [
          { lessonId: 1, score: 0 },
          { lessonId: 99, score: 100 },
        ],
      ).score,
    ).toBe(0);
    for (const score of [-1, 101, NaN])
      expect(
        calculateCourseScore([{ id: 1, quiz: [{}] }], [{ lessonId: 1, score }])
          .scoreStatus,
      ).toBe("unavailable");
  });
});
