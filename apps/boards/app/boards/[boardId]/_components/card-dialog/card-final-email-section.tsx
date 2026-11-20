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
  loadFinalEmailCard,
  previewFinalEmailRecipients,
  saveFinalEmailDraft,
  sendFinalEmail,
  type FinalEmailDraftData,
} from "../../_actions/final-email-actions";
import { isFinalEmailCard } from "../../_lib/final-email-card";
import type { BoardDetail } from "../../_lib/types";
import { MarkdownContent } from "./markdown-content";

export { isFinalEmailCard };

/** Must match `BUDGET_SUMMARY_PLACEHOLDER` in `@workspace/email`. */
const BUDGET_SUMMARY_PLACEHOLDER = "{{resumen_gastos}}";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function CardFinalEmailSection({
  board,
  cardId,
  readOnly,
}: {
  board: BoardDetail;
  cardId: number;
  readOnly?: boolean;
}) {
  const competition = board.competition;
  const [data, setData] = React.useState<FinalEmailDraftData | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [surveyUrl, setSurveyUrl] = React.useState("");
  const [certificatesUrl, setCertificatesUrl] = React.useState("");
  const [photosUrl, setPhotosUrl] = React.useState("");
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
    void loadFinalEmailCard({ boardId: board.id, cardId }).then((result) => {
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
      setSurveyUrl(result.data.surveyUrl);
      setCertificatesUrl(result.data.certificatesUrl);
      setPhotosUrl(result.data.photosUrl);
      setRecipientCount(null);
      setSampleNames([]);
      setSaveStatus("idle");
    });
    return () => {
      cancelled = true;
    };
  }, [board.id, cardId, competition?.id]);

  const persistDraft = React.useCallback(
    async (next: {
      subject: string;
      body: string;
      surveyUrl: string;
      certificatesUrl: string;
      photosUrl: string;
    }) => {
      if (!data?.canSend || readOnly) return;
      const generation = ++saveGenerationRef.current;
      setSaveStatus("saving");
      const result = await saveFinalEmailDraft({
        boardId: board.id,
        cardId,
        ...next,
      });
      if (generation !== saveGenerationRef.current) return;
      if (result.ok) {
        setSaveStatus("saved");
      } else {
        setSaveStatus("error");
        toast.error(result.message);
      }
    },
    [board.id, cardId, data?.canSend, readOnly],
  );

  React.useEffect(() => {
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }
    if (!data?.canSend || readOnly) return;
    const handle = window.setTimeout(() => {
      void persistDraft({
        subject,
        body,
        surveyUrl,
        certificatesUrl,
        photosUrl,
      });
    }, 800);
    return () => window.clearTimeout(handle);
  }, [
    subject,
    body,
    surveyUrl,
    certificatesUrl,
    photosUrl,
    data?.canSend,
    readOnly,
    persistDraft,
  ]);

  const previewMarkdown = React.useMemo(() => {
    if (!body.includes(BUDGET_SUMMARY_PLACEHOLDER)) return body;
    const budgetNote = data?.hasBudgetSummary
      ? "_Aquí se insertará la tabla de ingresos y egresos del presupuesto._"
      : "_Aquí se insertará la tabla de gastos (aún no hay presupuesto cargado)._";
    return body.replaceAll(BUDGET_SUMMARY_PLACEHOLDER, budgetNote);
  }, [body, data?.hasBudgetSummary]);

  if (!competition) {
    return (
      <section className="space-y-2 rounded-lg border border-dashed p-4">
        <h3 className="text-sm font-semibold">Correo de agradecimiento</h3>
        <p className="text-muted-foreground text-sm">
          Este tablero no está ligado a una competencia.
        </p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="space-y-2 rounded-lg border border-dashed p-4">
        <h3 className="text-sm font-semibold">Correo de agradecimiento</h3>
        <p className="text-sm text-rose-700">{loadError}</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="space-y-2 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Correo de agradecimiento</h3>
        <p className="text-muted-foreground text-sm">Cargando borrador…</p>
      </section>
    );
  }

  const editable = data.canSend && !readOnly;
  const alreadySent = Boolean(data.sentAt);

  const runPreview = () => {
    startPreview(async () => {
      const result = await previewFinalEmailRecipients({
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
      const result = await sendFinalEmail({
        boardId: board.id,
        cardId,
        subject,
        body,
        surveyUrl,
        certificatesUrl,
        photosUrl,
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
        <h3 className="text-sm font-semibold">Correo de agradecimiento</h3>
        <p className="text-muted-foreground mt-1 text-xs leading-5">
          Se envía a competidores aceptados del WCIF autenticado (un correo por
          persona). El cuerpo admite Markdown; al enviar se insertan el logo de
          la competencia, el equipo y la tabla del
          resumen de gastos.
        </p>
      </div>

      {!data.canSend ? (
        <p className="text-muted-foreground text-sm">
          Solo delegados u organizadores de la competencia pueden editar y
          enviar este correo.
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

      {data.sponsorNames.length > 0 ? (
        <p className="text-muted-foreground text-xs">
          Patrocinadores en el borrador: {data.sponsorNames.join(", ")}
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">
          Sin patrocinadores en la tarjeta de patrocinios; puedes mencionarlos
          manualmente en el cuerpo.
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor={`final-email-subject-${cardId}`}>Asunto</Label>
        <Input
          id={`final-email-subject-${cardId}`}
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          disabled={!editable || sendPending}
        />
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor={`final-email-body-${cardId}`}>Cuerpo (Markdown)</Label>
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
          id={`final-email-body-${cardId}`}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          disabled={!editable || sendPending}
          rows={16}
          className="font-mono text-xs leading-5"
        />
        <p className="text-muted-foreground text-xs">
          Usa{" "}
          <code className="text-[11px]">{BUDGET_SUMMARY_PLACEHOLDER}</code> donde
          quieras la tabla de gastos.
        </p>
      </div>

      {showPreview ? (
        <div className="rounded-md border bg-muted/20 p-3">
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Vista previa
          </p>
          <MarkdownContent content={previewMarkdown} />
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`final-email-survey-${cardId}`}>
            Encuesta de calidad (opcional)
          </Label>
          <Input
            id={`final-email-survey-${cardId}`}
            type="url"
            value={surveyUrl}
            onChange={(event) => setSurveyUrl(event.target.value)}
            disabled={!editable || sendPending}
            placeholder="https://"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`final-email-certs-${cardId}`}>
            Reconocimientos / Drive (opcional)
          </Label>
          <Input
            id={`final-email-certs-${cardId}`}
            type="url"
            value={certificatesUrl}
            onChange={(event) => setCertificatesUrl(event.target.value)}
            disabled={!editable || sendPending}
            placeholder="https://"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`final-email-photos-${cardId}`}>
            Fotos (opcional)
          </Label>
          <Input
            id={`final-email-photos-${cardId}`}
            type="url"
            value={photosUrl}
            onChange={(event) => setPhotosUrl(event.target.value)}
            disabled={!editable || sendPending}
            placeholder="https://"
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
              {alreadySent ? "Reenviar correo final" : "Enviar correo final"}
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
