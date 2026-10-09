import { describe, expect, it } from "vitest";
import { canManageCourses, canManageStaff } from "./permissions";
import { gradeQuiz } from "./grading";
import { cleanHtml } from "./content";
import {
  convertContent,
  convertQuestion,
  isCompleted,
  readCsv,
  uniqueRows,
} from "./sensei";
import { createQuizSession, verifyQuizSession } from "./quiz-session";
import type { CourseQuestion } from "@workspace/db/schema";

const quiz: CourseQuestion[] = [
  {
    id: "1",
    prompt: "Pregunta",
    type: "choice",
    options: ["A", "B", "C"],
    answers: ["A", "B"],
    points: 2,
  },
  {
    id: "2",
    prompt: "Pregunta",
    type: "boolean",
    options: ["Verdadero", "Falso"],
    answers: ["Verdadero"],
    points: 1,
  },
];
describe("permisos de cursos", () => {
  it("autoriza delegados y permisos específicos, sin conceder acceso a alumnos ni editores", () => {
    expect(canManageCourses("delegate")).toBe(true);
    for (const role of ["administrator", "developer", "instructor"])
      expect(canManageCourses("user", role)).toBe(true);
    expect(canManageCourses("user")).toBe(false);
    expect(canManageCourses("editor")).toBe(false);
    expect(canManageCourses("user", "made-up")).toBe(false);
  });
  it("solo administradores y desarrolladores asignan permisos", () => {
    expect(canManageStaff("instructor")).toBe(false);
    expect(canManageStaff()).toBe(false);
    expect(canManageStaff("administrator")).toBe(true);
    expect(canManageStaff("developer")).toBe(true);
  });
});
describe("evaluaciones", () => {
  it("exige todas las respuestas correctas y respeta ponderación", () => {
    expect(gradeQuiz(quiz, { "1": ["B", "A"], "2": ["Verdadero"] })).toBe(100);
    expect(gradeQuiz(quiz, { "1": ["A"], "2": ["Verdadero"] })).toBe(33);
    expect(gradeQuiz(quiz, { "1": ["A", "B", "C"], "2": [] })).toBe(0);
  });
  it("impide alterar preguntas, usar otro alumno o una evaluación antigua", () => {
    process.env.BETTER_AUTH_SECRET = "test-secret-local-for-quiz-validation-32";
    const session = createQuizSession(quiz, 1, 7, "student");
    expect(
      verifyQuizSession(session.token, quiz, 1, 7, "student"),
    ).toHaveLength(1);
    expect(() =>
      verifyQuizSession(session.token, quiz, 1, 7, "other"),
    ).toThrow();
    expect(() =>
      verifyQuizSession(session.token, quiz, 1, 8, "student"),
    ).toThrow();
    expect(() =>
      verifyQuizSession(session.token, quiz, 2, 7, "student"),
    ).toThrow();
    expect(() =>
      verifyQuizSession(
        session.token,
        quiz.map((q) => ({ ...q, points: 3 })),
        1,
        7,
        "student",
      ),
    ).toThrow();
    expect(() =>
      verifyQuizSession(session.token + "bad", quiz, 1, 7, "student"),
    ).toThrow();
  });
});
describe("migración Sensei", () => {
  it("preserva comas en opciones y respuestas de booleanos", () => {
    const result = convertQuestion({
      Id: "9",
      Question: "Pregunta",
      Type: "multiple-choice",
      Grade: "1",
      Answer: 'Wrong:No,Right:"Iniciales, papeletas, incidentes",Wrong:Otra',
    });
    expect(result.answers).toEqual(["Iniciales, papeletas, incidentes"]);
    expect(result.options).toHaveLength(3);
    expect(
      convertQuestion({
        Id: "10",
        Question: "¿Sí?",
        Type: "boolean",
        Grade: "1",
        Answer: "false",
      }).answers,
    ).toEqual(["Falso"]);
  });
  it("conserva la columna adicional de certificados sin tolerar pérdida de datos", () => {
    expect(
      readCsv(
        'Student,Certificate\nAlumna,,"<a href=""https://old.amscubing.org/certificate/abc/"">Certificado</a>"',
      )[0]?.Certificate,
    ).toContain("certificate/abc");
    expect(() => readCsv("Id,Name\n1,Name,Unexpected")).toThrow();
  });
  it("rechaza duplicados inconsistentes y finalizaciones no aprobadas", () => {
    expect(
      uniqueRows([
        { Id: "1", Lesson: "A" },
        { Id: "1", Lesson: "A" },
      ]).size,
    ).toBe(1);
    expect(() =>
      uniqueRows([
        { Id: "1", Lesson: "A" },
        { Id: "1", Lesson: "B" },
      ]),
    ).toThrow();
    expect(isCompleted("Completado")).toBe(true);
    expect(isCompleted("Suspendido")).toBe(false);
    expect(isCompleted("En Progreso")).toBe(false);
  });
  it("elimina soluciones incrustadas, scripts y medios no autorizados", () => {
    const result = convertContent(
      "<p>Lección</p><!-- wp:sensei-lms/quiz --><p>Respuesta secreta</p><!-- /wp:sensei-lms/quiz --><script>alert(1)</script>",
    );
    expect(result).toContain("Lección");
    expect(result).not.toContain("secreta");
    expect(result).not.toContain("script");
    expect(
      cleanHtml(
        '<img src="x" onerror="alert(1)"><iframe src="https://evil.example/"></iframe><a href="javascript:alert(1)">X</a>',
      ),
    ).not.toMatch(/onerror|evil.example|javascript:/);
  });
});
