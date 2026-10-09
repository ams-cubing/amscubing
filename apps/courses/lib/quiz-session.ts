import {
  createHash,
  createHmac,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import type { CourseQuestion } from "@workspace/db/schema";

function sign(payload: string) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("Falta BETTER_AUTH_SECRET");
  return createHmac("sha256", secret).update(payload).digest("hex");
}
const version = (quiz: CourseQuestion[]) =>
  createHash("sha256").update(JSON.stringify(quiz)).digest("hex");
export function createQuizSession(
  quiz: CourseQuestion[],
  count: number,
  lessonId: number,
  userId: string,
) {
  const pool = [...quiz];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  const selected = pool.slice(
    0,
    count > 0 ? Math.min(count, pool.length) : pool.length,
  );
  const payload = Buffer.from(
    JSON.stringify({
      ids: selected.map((q) => q.id),
      lessonId,
      userId,
      version: version(quiz),
      expires: Date.now() + 4 * 60 * 60 * 1000,
    }),
  ).toString("base64url");
  return { questions: selected, token: `${payload}.${sign(payload)}` };
}
export function verifyQuizSession(
  token: string,
  quiz: CourseQuestion[],
  count: number,
  lessonId: number,
  userId: string,
) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !/^[a-f0-9]{64}$/.test(signature))
    throw new Error("Evaluación inválida");
  if (
    !timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(sign(payload), "hex"),
    )
  )
    throw new Error("Evaluación inválida");
  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  const expected = count > 0 ? Math.min(count, quiz.length) : quiz.length;
  if (
    data.lessonId !== lessonId ||
    data.userId !== userId ||
    data.expires < Date.now() ||
    data.version !== version(quiz) ||
    !Array.isArray(data.ids) ||
    data.ids.length !== expected ||
    new Set(data.ids).size !== expected
  )
    throw new Error(
      "La evaluación cambió o expiró. Vuelve a cargar la lección.",
    );
  return data.ids.map((id: string) => {
    const q = quiz.find((q) => q.id === id);
    if (!q) throw new Error("Pregunta inexistente");
    return q;
  }) as CourseQuestion[];
}
