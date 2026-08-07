"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";

import { acceptBoardInvite } from "@/app/_actions/board-management";

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            const result = await acceptBoardInvite(token);
            router.push(`/boards/${result.boardId}`);
            router.refresh();
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "No se pudo aceptar la invitación",
            );
          }
        });
      }}
    >
      {pending ? "Uniéndote..." : "Aceptar invitación"}
    </Button>
  );
}
