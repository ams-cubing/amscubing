"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

import {
  createBoardInvite,
  deleteBoard,
  removeBoardMember,
  renameBoard,
  revokeBoardInvite,
  unarchiveBoard,
} from "@/app/_actions/board-management";

type BoardMemberRow = {
  userId: string;
  name: string;
  wcaId: string;
};

export function BoardDelegateControls({
  boardId,
  boardName,
  isTemplate,
  isArchived,
  inviteUrl,
  inviteId,
  members,
}: {
  boardId: number;
  boardName: string;
  isTemplate: boolean;
  isArchived: boolean;
  inviteUrl: string | null;
  inviteId: number | null;
  members: BoardMemberRow[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <RenameBoardDialog boardId={boardId} currentName={boardName} />
      {!isTemplate && (
        <InviteBoardDialog
          boardId={boardId}
          initialUrl={inviteUrl}
          initialInviteId={inviteId}
          members={members}
        />
      )}
      {isArchived && <UnarchiveButton boardId={boardId} />}
      <DeleteBoardDialog boardId={boardId} boardName={boardName} />
    </div>
  );
}

function RenameBoardDialog({
  boardId,
  currentName,
}: {
  boardId: number;
  currentName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setName(currentName);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Renombrar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renombrar tablero</DialogTitle>
          <DialogDescription>
            Cambia el nombre visible del tablero.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          <Label htmlFor="rename-board">Nombre</Label>
          <Input
            id="rename-board"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              Cancelar
            </Button>
          </DialogClose>
          <Button
            disabled={pending || !name.trim()}
            onClick={() => {
              startTransition(async () => {
                try {
                  await renameBoard({ boardId, name });
                  toast.success("Tablero renombrado");
                  setOpen(false);
                  router.refresh();
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "No se pudo renombrar",
                  );
                }
              });
            }}
          >
            {pending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InviteBoardDialog({
  boardId,
  initialUrl,
  initialInviteId,
  members: initialMembers,
}: {
  boardId: number;
  initialUrl: string | null;
  initialInviteId: number | null;
  members: BoardMemberRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(initialUrl);
  const [inviteId, setInviteId] = useState(initialInviteId);
  const [members, setMembers] = useState(initialMembers);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setUrl(initialUrl);
          setInviteId(initialInviteId);
          setMembers(initialMembers);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Invitar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Invitar al tablero</DialogTitle>
          <DialogDescription>
            Comparte el enlace para que cualquier usuario autenticado se una.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {url ? (
            <div className="flex gap-2">
              <Input readOnly value={url} className="font-mono text-xs" />
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  await navigator.clipboard.writeText(url);
                  toast.success("Enlace copiado");
                }}
              >
                Copiar
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aún no hay un enlace activo.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  try {
                    const result = await createBoardInvite({
                      boardId,
                      rotate: Boolean(url),
                    });
                    setUrl(result.url);
                    setInviteId(result.inviteId);
                    toast.success(url ? "Enlace regenerado" : "Enlace listo");
                    router.refresh();
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "No se pudo crear el enlace",
                    );
                  }
                });
              }}
            >
              {url ? "Regenerar enlace" : "Crear enlace"}
            </Button>
            {inviteId != null && (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    try {
                      await revokeBoardInvite({ inviteId });
                      setUrl(null);
                      setInviteId(null);
                      toast.success("Enlace revocado");
                      router.refresh();
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "No se pudo revocar",
                      );
                    }
                  });
                }}
              >
                Revocar
              </Button>
            )}
          </div>

          {members.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <p className="text-sm font-medium">Miembros invitados</p>
              <ul className="space-y-2">
                {members.map((member) => (
                  <li
                    key={member.userId}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span>
                      {member.name}{" "}
                      <span className="text-muted-foreground">
                        ({member.wcaId})
                      </span>
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          try {
                            await removeBoardMember({
                              boardId,
                              userId: member.userId,
                            });
                            setMembers((prev) =>
                              prev.filter((m) => m.userId !== member.userId),
                            );
                            toast.success("Miembro eliminado");
                            router.refresh();
                          } catch (error) {
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : "No se pudo eliminar",
                            );
                          }
                        });
                      }}
                    >
                      Quitar
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UnarchiveButton({ boardId }: { boardId: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            await unarchiveBoard({ boardId });
            toast.success("Tablero desarchivado");
            router.refresh();
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "No se pudo desarchivar",
            );
          }
        });
      }}
    >
      {pending ? "Desarchivando..." : "Desarchivar"}
    </Button>
  );
}

function DeleteBoardDialog({
  boardId,
  boardName,
}: {
  boardId: number;
  boardName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Eliminar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar tablero</DialogTitle>
          <DialogDescription>
            Se eliminará permanentemente «{boardName}» y todo su contenido. Esta
            acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              Cancelar
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                try {
                  await deleteBoard({ boardId });
                  toast.success("Tablero eliminado");
                  router.push("/");
                  router.refresh();
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "No se pudo eliminar",
                  );
                }
              });
            }}
          >
            {pending ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
