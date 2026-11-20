"use client";

import * as React from "react";
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
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";

import {
  loadInformativeEmailCard,
  previewInformativeEmailRecipients,
  saveInformativeEmailDraft,
  sendInformativeEmail,
  type InformativeEmailDraftData,
} from "../../_actions/informative-email-actions";
import { isInformativeEmailCard } from "../../_lib/informative-email-card";
import type { BoardDetail } from "../../_lib/types";
import { MarkdownContent } from "./markdown-content";

export { isInformativeEmailCard };

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function CardInformativeEmailSection({
  board,
  cardId,
  readOnly,
}: {
  board: BoardDetail;
  cardId: number;
  readOnly?: boolean;
}) {
  const competition = board.competition;
  const [data, setData] = React.useState<InformativeEmailDraftData | null>(
    null,
  );
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [updateNote, setUpdateNote] = React.useState("");
  const [checkIn, setCheckIn] = React.useState("");
  const [tutorialTime, setTutorialTime] = React.useState("");
  const [scheduleUrl, setScheduleUrl] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [mapsUrl, setMapsUrl] = React.useState("");
  const [parking, setParking] = React.useState("");
  const [unofficialEvents, setUnofficialEvents] = React.useState("");
  const [thanks, setThanks] = React.useState("");
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>("idle");
  const [showPreview, setShowPreview] = React.useState(true);
  const [recipientCount, setRecipientCount] = React.useState<number | null>(
    null,
  );
  const [sampleNames, setSampleNames] = React.useState<string[]>([]);
  const [previewPending, startPreview] = React.useTransition();
  const [sendPending, startSend] = React.useTransition();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const skipAutosaveRef = React.useRef(true);
  const saveGenerationRef = React.useRef(0);

  React.useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    void loadInformativeEmailCard({ boardId: board.id, cardId }).then(
      (result) => {
        if (cancelled) return;
        if (!result.ok) {
          setLoadError(result.message);
          setData(null);
          return;
        }
        skipAutosaveRef.current = true;
        setData(result.data);
        setSubject(result.data.subject);
        setBody(result.data.body);
        setUpdateNote(result.data.updateNote);
        setCheckIn(result.data.checkIn);
        setTutorialTime(result.data.tutorialTime);
        setScheduleUrl(result.data.scheduleUrl);
        setAddress(result.data.address);
        setMapsUrl(result.data.mapsUrl);
        setParking(result.data.parking);
        setUnofficialEvents(result.data.unofficialEvents);
        setThanks(result.data.thanks);
        setRecipientCount(null);
        setSampleNames([]);
        setSaveStatus("idle");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [board.id, cardId, competition?.id]);

  const draftPayload = React.useCallback(
    () => ({
      subject,
      body,
      updateNote,
      checkIn,
      tutorialTime,
      scheduleUrl,
      address,
      mapsUrl,
      parking,
      unofficialEvents,
      thanks,
    }),
    [
      subject,
      body,
      updateNote,
      checkIn,
      tutorialTime,
      scheduleUrl,
      address,
      mapsUrl,
      parking,
      unofficialEvents,
      thanks,
    ],
  );

  const persistDraft = React.useCallback(async () => {
    if (!data?.canSend || readOnly) return;
    const generation = ++saveGenerationRef.current;
    setSaveStatus("saving");
    const result = await saveInformativeEmailDraft({
      boardId: board.id,
      cardId,
      ...draftPayload(),
    });
    if (generation !== saveGenerationRef.current) return;
    if (result.ok) {
      setSaveStatus("saved");
    } else {
      setSaveStatus("error");
      toast.error(result.message);
    }
  }, [board.id, cardId, data?.canSend, draftPayload, readOnly]);

  React.useEffect(() => {
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }
    if (!data?.canSend || readOnly) return;
    const handle = window.setTimeout(() => {
      void persistDraft();
    }, 800);
    return () => window.clearTimeout(handle);
  }, [data?.canSend, draftPayload, persistDraft, readOnly]);

  if (!competition) {
    return (
      <section className="space-y-2 rounded-lg border border-dashed p-4">
        <h3 className="text-sm font-semibold">Correo informativo</h3>
        <p className="text-muted-foreground text-sm">
          Este tablero no está ligado a una competencia.
        </p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="space-y-2 rounded-lg border border-dashed p-4">
        <h3 className="text-sm font-semibold">Correo informativo</h3>
        <p className="text-sm text-rose-700">{loadError}</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="space-y-2 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Correo informativo</h3>
        <p className="text-muted-foreground text-sm">Cargando borrador…</p>
      </section>
    );
  }

  const editable = data.canSend && !readOnly;
  const alreadySent = Boolean(data.sentAt);
  const checkInHref = `/boards/${board.id}/registro/check-in`;

  const runPreview = () => {
    startPreview(async () => {
      const result = await previewInformativeEmailRecipients({
        boardId: board.id,
        cardId,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setRecipientCount(result.count);
      setSampleNames(result.sampleNames);
      toast.success(result.message);
    });
  };

  const runSend = (confirmResend: boolean) => {
    startSend(async () => {
      const result = await sendInformativeEmail({
        boardId: board.id,
        cardId,
        ...draftPayload(),
        confirmResend,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setConfirmOpen(false);
      setRecipientCount(result.recipientCount);
      setData((prev) =>
        prev
          ? {
              ...prev,
              sentAt: new Date().toISOString(),
              sentRecipientCount: result.recipientCount,
            }
          : prev,
      );
      toast.success(result.message);
    });
  };

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="text-sm font-semibold">Correo informativo</h3>
        <p className="text-muted-foreground mt-1 text-xs leading-5">
          Se envía a competidores aceptados del WCIF autenticado (un correo por
          persona). El cuerpo admite Markdown; el pie con el logo de la
          competencia y el equipo se agrega al enviar.
        </p>
      </div>

      {!data.canSend ? (
        <p className="text-muted-foreground text-sm">
          Solo delegados u organizadores de la competencia pueden editar,
          descargar el registro y enviar este correo.
        </p>
      ) : null}

      {alreadySent ? (
        <p className="text-sm text-emerald-800">
          Enviado
          {data.sentRecipientCount != null
            ? ` a ${data.sentRecipientCount} competidores`
            : ""}
          {data.sentAt
            ? ` el ${new Date(data.sentAt).toLocaleString("es-MX", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "America/Mexico_City",
              })}`
            : ""}
          .
        </p>
      ) : null}

      {data.canSend ? (
        <div>
          <Button type="button" size="sm" variant="outline" asChild>
            <a href={checkInHref} target="_blank" rel="noreferrer">
              Descargar lista de registro (CSV)
            </a>
          </Button>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor={`info-email-subject-${cardId}`}>Asunto</Label>
        <Input
          id={`info-email-subject-${cardId}`}
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          disabled={!editable || sendPending}
        />
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor={`info-email-body-${cardId}`}>Cuerpo (Markdown)</Label>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setShowPreview((value) => !value)}
          >
            {showPreview ? "Ocultar vista previa" : "Ver vista previa"}
          </Button>
        </div>
        <Textarea
          id={`info-email-body-${cardId}`}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          disabled={!editable || sendPending}
          rows={14}
          className="font-mono text-xs leading-5"
        />
      </div>

      {showPreview ? (
        <div className="rounded-md border bg-muted/20 p-3">
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Vista previa
          </p>
          <MarkdownContent content={body} />
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`info-email-update-${cardId}`}>
            Actualización importante (opcional)
          </Label>
          <Textarea
            id={`info-email-update-${cardId}`}
            value={updateNote}
            onChange={(event) => setUpdateNote(event.target.value)}
            disabled={!editable || sendPending}
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`info-email-checkin-${cardId}`}>
            Check-in (día – hora)
          </Label>
          <Input
            id={`info-email-checkin-${cardId}`}
            value={checkIn}
            onChange={(event) => setCheckIn(event.target.value)}
            disabled={!editable || sendPending}
            placeholder="Sábado – 8:00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`info-email-tutorial-${cardId}`}>
            Tutorial nuevos (hora)
          </Label>
          <Input
            id={`info-email-tutorial-${cardId}`}
            value={tutorialTime}
            onChange={(event) => setTutorialTime(event.target.value)}
            disabled={!editable || sendPending}
            placeholder="8:30"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`info-email-schedule-${cardId}`}>
            Enlace al horario
          </Label>
          <Input
            id={`info-email-schedule-${cardId}`}
            value={scheduleUrl}
            onChange={(event) => setScheduleUrl(event.target.value)}
            disabled={!editable || sendPending}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`info-email-address-${cardId}`}>Dirección</Label>
          <Input
            id={`info-email-address-${cardId}`}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            disabled={!editable || sendPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`info-email-maps-${cardId}`}>Google Maps</Label>
          <Input
            id={`info-email-maps-${cardId}`}
            type="url"
            value={mapsUrl}
            onChange={(event) => setMapsUrl(event.target.value)}
            disabled={!editable || sendPending}
            placeholder="https://"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`info-email-parking-${cardId}`}>
            Estacionamiento
          </Label>
          <Input
            id={`info-email-parking-${cardId}`}
            value={parking}
            onChange={(event) => setParking(event.target.value)}
            disabled={!editable || sendPending}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`info-email-unofficial-${cardId}`}>
            Eventos no oficiales (opcional)
          </Label>
          <Textarea
            id={`info-email-unofficial-${cardId}`}
            value={unofficialEvents}
            onChange={(event) => setUnofficialEvents(event.target.value)}
            disabled={!editable || sendPending}
            rows={2}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`info-email-thanks-${cardId}`}>
            Agradecimientos (opcional)
          </Label>
          <Textarea
            id={`info-email-thanks-${cardId}`}
            value={thanks}
            onChange={(event) => setThanks(event.target.value)}
            disabled={!editable || sendPending}
            rows={2}
          />
        </div>
      </div>

      {editable ? (
        <p className="text-muted-foreground text-xs">
          {saveStatus === "saving"
            ? "Guardando borrador…"
            : saveStatus === "saved"
              ? "Borrador guardado"
              : saveStatus === "error"
                ? "No se pudo guardar el borrador"
                : "Los cambios se guardan solos"}
        </p>
      ) : null}

      {recipientCount != null ? (
        <div className="space-y-1 text-sm">
          <p>
            Destinatarios: <strong>{recipientCount}</strong>
          </p>
          {sampleNames.length > 0 ? (
            <p className="text-muted-foreground text-xs">
              Ejemplos: {sampleNames.join(", ")}
              {recipientCount > sampleNames.length ? "…" : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      {editable ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={previewPending || sendPending}
            onClick={runPreview}
          >
            {previewPending ? "Consultando…" : "Actualizar destinatarios"}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={sendPending || !subject.trim() || !body.trim()}
            onClick={() => {
              if (recipientCount == null) {
                toast.message(
                  "Consulta primero los destinatarios para confirmar el conteo",
                );
                runPreview();
                return;
              }
              if (recipientCount === 0) {
                toast.error("No hay destinatarios para enviar");
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {sendPending ? "Enviando…" : "Enviar correo"}
          </Button>
        </div>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {alreadySent
                ? "Reenviar correo informativo"
                : "Enviar correo informativo"}
            </DialogTitle>
            <DialogDescription>
              {alreadySent
                ? `Este correo ya se envió antes. ¿Reenviar ahora a ${recipientCount ?? "?"} competidores?`
                : `Se enviará a ${recipientCount ?? "?"} competidores (un correo por persona).`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={sendPending}>
                Cancelar
              </Button>
            </DialogClose>
            <Button
              disabled={sendPending}
              onClick={() => runSend(alreadySent)}
            >
              {sendPending
                ? "Enviando…"
                : alreadySent
                  ? "Reenviar"
                  : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
