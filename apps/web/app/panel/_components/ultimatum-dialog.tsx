"use client";

import React, { useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { toast } from "sonner";
import { sendUltimatum } from "../_actions/ultimatum";
import { Label } from "@workspace/ui/components/label";
import { Calendar } from "@workspace/ui/components/calendar";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@workspace/ui/components/popover";
import { useForm } from "react-hook-form";

export function UltimatumDialog({
  competitionId,
  competitionLastDate,
  open,
  setOpen,
}: {
  competitionId: number;
  competitionLastDate: Date;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const form = useForm<{ deadline: Date }>({
    defaultValues: { deadline: undefined },
  });
  const {
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
    watch,
  } = form;

  const deadline = watch("deadline");

  const startOfToday = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const competitionEnd = React.useMemo(() => {
    const d = new Date(competitionLastDate);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [competitionLastDate]);

  const [pending, startTransition] = useTransition();

  const onSubmit = handleSubmit(async (values) => {
    if (!values.deadline) {
      setError("deadline", {
        type: "required",
        message: "Selecciona una fecha límite",
      });
      return;
    }
    startTransition(async () => {
      try {
        const res = await sendUltimatum({
          competitionId,
          deadline: values.deadline,
          message,
        });
        if (res?.success) {
          toast.success("Ultimátum enviado");
          setOpen(false);
        } else {
          toast.error(res?.message || "Error");
        }
      } catch {
        toast.error("Error");
      }
    });
  });

  // keep message state as before
  const [message, setMessage] = React.useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-semibold">
              Enviar ultimátum
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="grid gap-6">
              <div>
                <Label className="mb-2">Fecha límite</Label>
                <div className="mt-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        data-invalid={!!form.formState.errors.deadline}
                        className="w-full text-left data-[invalid=true]:ring-2 data-[invalid=true]:ring-destructive/20 dark:data-[invalid=true]:ring-destructive/40 data-[invalid=true]:border-destructive"
                        type="button"
                      >
                        {deadline
                          ? deadline.toLocaleDateString()
                          : "Selecciona fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={deadline}
                        onSelect={(d) => {
                          setValue("deadline", d as Date, {
                            shouldValidate: true,
                          });
                        }}
                        disabled={(d: Date) =>
                          d.getTime() < startOfToday.getTime() ||
                          d.getTime() > competitionEnd.getTime()
                        }
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.deadline?.message && (
                    <p className="mt-2 text-sm text-destructive">
                      {errors.deadline.message}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-muted-foreground">
                    Selecciona la fecha límite para la competencia.
                  </p>
                </div>
              </div>

              <div>
                <Label className="mb-2">Mensaje</Label>
                <div className="mt-2 rounded-md border border-slate-100 p-3 bg-slate-50">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Escribe un mensaje opcional que acompañe el ultimátum..."
                  />
                  <div className="mt-3 text-sm text-muted-foreground space-y-2">
                    <p className="whitespace-pre-line">
                      Hola,
                      {"\n"}Se ha enviado un ultimátum para una de tus
                      competencias.
                      {"\n"}Fecha límite:{" "}
                      {deadline
                        ? deadline.toLocaleDateString()
                        : "No especificada"}
                    </p>
                    {message && (
                      <p className="whitespace-pre-line">{message}</p>
                    )}
                    <p>Saludos,</p>
                    <p className="font-medium">
                      Equipo de la Asociación Mexicana de Speedcubing
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-1 text-sm text-slate-500">
              <span className="font-medium">Vista previa:</span> revisa la fecha
              y el mensaje antes de enviar.
            </div>
          </div>

          <DialogFooter>
            <div className="flex w-full items-center justify-end gap-2">
              <DialogClose type="button" asChild>
                <Button variant="ghost" className="min-w-24">
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={pending}
                className="min-w-30"
              >
                {pending ? "Enviando..." : "Enviar ultimátum"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
