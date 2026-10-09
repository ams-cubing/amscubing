import type { CourseQuestion } from "@workspace/db/schema";

export function gradeQuiz(
  questions: CourseQuestion[],
  answers: Record<string, string[]>,
) {
  const normalize = (s: string) => s.trim().toLocaleLowerCase("es");
  let earned = 0;
  let total = 0;
  for (const question of questions) {
    total += question.points;
    const actual = (answers[question.id] ?? []).map(normalize).sort();
    const expected = question.answers.map(normalize).sort();
    if (expected.length && JSON.stringify(actual) === JSON.stringify(expected))
      earned += question.points;
  }
  return total ? Math.round((100 * earned) / total) : 0;
}
