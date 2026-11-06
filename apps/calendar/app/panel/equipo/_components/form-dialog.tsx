"use client";

import { useState, type ReactNode } from "react";
import {
  ActionForm,
  type ActionFormState,
} from "@workspace/ui/components/action-form";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";

import { SubmitButton } from "./submit-button";

export function FormDialog({
  trigger,
  title,
  description,
  action,
  submitLabel = "Guardar",
  children,
}: {
  trigger: ReactNode;
  title: string;
  description?: ReactNode;
  action: (state: ActionFormState, data: FormData) => Promise<ActionFormState>;
  submitLabel?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <ActionForm
          action={action}
          onSuccess={() => setOpen(false)}
          className="space-y-4"
        >
          {children}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <SubmitButton>{submitLabel}</SubmitButton>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
