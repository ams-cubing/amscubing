"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { fetchAndCreateWCAUser } from "../_actions/wca-users";
import { toast } from "sonner";

type AddWCAUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserAdded: (user: { wcaId: string; name: string }) => void;
};

export function AddWCAUserDialog({
  open,
  onOpenChange,
  onUserAdded,
}: AddWCAUserDialogProps) {
  const [wcaId, setWcaId] = useState("");
  const [pending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    startTransition(async () => {
      try {
        const result = await fetchAndCreateWCAUser(wcaId.trim().toUpperCase());

        if (result.success && result.user) {
          toast.success(result.message);
          onUserAdded({
            wcaId: result.user.wcaId,
            name: result.user.name,
          });
          setWcaId("");
          onOpenChange(false);
        } else {
          toast.error(result.message);
        }
      } catch {
        toast.error("Error al agregar usuario");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Agregar organizador desde WCA</DialogTitle>
            <DialogDescription>
              Ingresa el WCA ID del organizador para agregarlo al sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="wcaId">WCA ID</Label>
            <Input
              id="wcaId"
              placeholder="Ej: 2016TORO03"
              value={wcaId}
              onChange={(e) => setWcaId(e.target.value)}
              className="mt-2"
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || !wcaId.trim()}>
              {pending ? "Agregando..." : "Agregar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
