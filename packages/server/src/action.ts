import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";

/** Shape returned by form actions and consumed by `ActionForm` (`@workspace/ui`). */
export type ActionResult = { ok: boolean; message?: string };

/** Expected failure whose message is safe to show to the user. */
export class ActionError extends Error {}

/**
 * Runs a form action and turns expected failures into `{ ok: false, message }`.
 * `redirect()`, `notFound()`, `forbidden()` and similar still propagate.
 */
export async function runAction(
  run: () => Promise<ActionResult | void>,
  invalidMessage = "Revisa los datos del formulario.",
): Promise<ActionResult> {
  try {
    return (await run()) ?? { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ActionError)
      return { ok: false, message: error.message };
    if (error instanceof ZodError || error instanceof SyntaxError)
      return { ok: false, message: invalidMessage };
    throw error;
  }
}
