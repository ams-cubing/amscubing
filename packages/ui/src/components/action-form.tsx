"use client";

import { useActionState, useEffect, type ComponentProps } from "react";
import { toast } from "sonner";

export type ActionFormState = { ok: boolean; message?: string } | null;

/**
 * Form bound to a server action that returns `{ ok, message }`; the message is
 * shown as a toast. Actions may still `redirect()` on success.
 */
export function ActionForm({
  action,
  children,
  ...props
}: Omit<ComponentProps<"form">, "action"> & {
  action: (
    state: ActionFormState,
    formData: FormData,
  ) => Promise<ActionFormState>;
}) {
  const [state, formAction] = useActionState(action, null);

  useEffect(() => {
    if (!state?.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} {...props}>
      {children}
    </form>
  );
}
