"use client";
import { useFormStatus } from "react-dom";
import { Button } from "@workspace/ui/components/button";
export function Submit({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="destructive"
      className={className}
      disabled={pending}
    >
      {pending ? "Guardando…" : children}
    </Button>
  );
}
