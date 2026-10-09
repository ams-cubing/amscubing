export type CourseScore = {
  score: number | null;
  scoreStatus: "scored" | "unavailable" | "ungraded";
};

/** Equal weight per assessed lesson. Readings never count as zero or 100. */
export function calculateCourseScore(
  lessons: { id: number; quiz: unknown[] }[],
  progress: { lessonId: number; score: number | null }[],
): CourseScore {
  const ids = new Set(lessons.map((lesson) => lesson.id));
  const scores = new Map(
    progress
      .filter((p) => ids.has(p.lessonId))
      .map((p) => [p.lessonId, p.score]),
  );
  const valid = (score: number | null | undefined): score is number =>
    typeof score === "number" &&
    Number.isFinite(score) &&
    score >= 0 &&
    score <= 100;
  const assessed = lessons.filter(
    (l) => l.quiz.length || scores.get(l.id) != null,
  );
  if (!assessed.length) return { score: null, scoreStatus: "ungraded" };
  if (assessed.some((l) => !valid(scores.get(l.id))))
    return { score: null, scoreStatus: "unavailable" };
  return {
    score: Math.round(
      assessed.reduce((sum, l) => sum + scores.get(l.id)!, 0) / assessed.length,
    ),
    scoreStatus: "scored",
  };
}

export function formatCourseScore(result: CourseScore) {
  return result.scoreStatus === "scored" && result.score !== null
    ? `${result.score}/100`
    : result.scoreStatus === "ungraded"
      ? "Sin evaluación numérica"
      : "Puntuación no disponible";
}
