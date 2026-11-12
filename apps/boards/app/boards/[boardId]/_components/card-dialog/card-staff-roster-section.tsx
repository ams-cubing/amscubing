"use client";

import * as React from "react";
import { Copy, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { CompetitionStaffEntry } from "@workspace/db/competition-staff";
import {
  STAFF_ACTIVITIES,
  STAFF_ACTIVITY_LABELS,
  STAFF_COURSE_STATUS_LABELS,
  type StaffActivity,
} from "@workspace/db/staff-labels";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

import {
  loadStaffRosterCard,
  removeStaffMemberFromCard,
  saveStaffMemberFromCard,
  type StaffRosterData,
  type StaffRosterMutationResult,
} from "../../_actions/staff-roster-actions";
import type { StaffCardMode } from "../../_lib/staff-cards";
import type { BoardDetail } from "../../_lib/types";

type Draft = {
  memberId?: number;
  name: string;
  wcaId: string;
  email: string;
  activities: StaffActivity[];
};

const EMPTY_DRAFT: Draft = { name: "", wcaId: "", email: "", activities: [] };

const dateFormat = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeZone: "America/Mexico_City",
});

function courseHint(member: CompetitionStaffEntry) {
  switch (member.course?.status) {
    case "in_progress":
      return "Aún no termina el curso.";
    case "not_enrolled":
      return "Comparte con esta persona el enlace del curso.";
    case "no_account":
      return member.wcaId || member.email
        ? "Pídele que inicie sesión en cursos con su cuenta WCA."
        : "Agrega su WCA ID o correo para ver su avance.";
    default:
      return null;
  }
}

function CourseStatus({ member }: { member: CompetitionStaffEntry }) {
  const progress = member.course;
  if (!progress) return null;
  if (progress.status === "completed") {
    return (
      <div className="space-y-0.5 text-right">
        <Badge variant="brand">{STAFF_COURSE_STATUS_LABELS.completed}</Badge>
        <p className="text-muted-foreground text-xs">
          {dateFormat.format(new Date(progress.completedAt))}
          {progress.source === "wordpress" ? " · en WordPress" : null}
        </p>
        {progress.folio ? (
          <p className="text-muted-foreground font-mono text-[11px]">
            {progress.folio}
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <Badge variant="outline">
      {STAFF_COURSE_STATUS_LABELS[progress.status]}
    </Badge>
  );
}

export function CardStaffRosterSection({
  board,
  cardId,
  mode,
  readOnly,
}: {
  board: BoardDetail;
  cardId: number;
  mode: StaffCardMode;
  readOnly?: boolean;
}) {
  const [data, setData] = React.useState<StaffRosterData | null>();
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!board.competition) return;
    let cancelled = false;
    loadStaffRosterCard({ boardId: board.id, cardId })
      .then((result) => {
        if (cancelled) return;
        if (result.ok) setData(result.data);
        else {
          setData(null);
          toast.error(result.message);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          toast.error("No se pudo cargar la lista de staff");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [board.competition, board.id, cardId]);

  const heading = <h3 className="text-sm font-semibold">Staff</h3>;

  if (!board.competition) {
    return (
      <section className="space-y-2 rounded-lg border border-dashed p-4">
        {heading}
        <p className="text-muted-foreground text-sm">
          Este tablero no está ligado a una competencia; no se puede llevar la
          lista de staff.
        </p>
      </section>
    );
  }

  if (data === undefined) {
    return (
      <section className="space-y-2 rounded-lg border p-4">
        {heading}
        <p className="text-muted-foreground text-sm">Cargando…</p>
      </section>
    );
  }

  if (data === null) {
    return (
      <section className="space-y-2 rounded-lg border border-dashed p-4">
        {heading}
        <p className="text-muted-foreground text-sm">
          No se pudo cargar la lista de staff.
        </p>
      </section>
    );
  }

  const { course, members } = data;
  const completed = members.filter(
    (member) => member.course?.status === "completed",
  ).length;
  const activityCounts = STAFF_ACTIVITIES.map((activity) => ({
    activity,
    count: members.filter((member) => member.activities.includes(activity))
      .length,
  }));

  const runMutation = (
    action: () => Promise<StaffRosterMutationResult>,
    onSuccess?: () => void,
  ) => {
    startTransition(async () => {
      try {
        const result = await action();
        if (result.ok) {
          setData(result.data);
          onSuccess?.();
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
      } catch {
        toast.error("No se pudo actualizar la lista de staff");
      }
    });
  };

  const save = () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast.error("Escribe el nombre");
      return;
    }
    runMutation(
      () =>
        saveStaffMemberFromCard({
          boardId: board.id,
          cardId,
          memberId: draft.memberId,
          name: draft.name,
          wcaId: draft.wcaId,
          email: draft.email,
          activities: draft.activities,
        }),
      () => setDraft(null),
    );
  };

  const remove = (member: CompetitionStaffEntry) => {
    runMutation(
      () =>
        removeStaffMemberFromCard({
          boardId: board.id,
          cardId,
          memberId: member.id,
        }),
      () => {
        if (draft?.memberId === member.id) setDraft(null);
      },
    );
  };

  const copyCourseLink = async () => {
    if (!course) return;
    try {
      await navigator.clipboard.writeText(course.url);
      toast.success("Enlace del curso copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  const form = draft ? (
    <div className="space-y-3 rounded-md border p-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={`staff-name-${cardId}`}>Nombre</Label>
          <Input
            id={`staff-name-${cardId}`}
            value={draft.name}
            maxLength={120}
            disabled={pending}
            autoFocus
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`staff-wca-${cardId}`}>WCA ID (opcional)</Label>
          <Input
            id={`staff-wca-${cardId}`}
            value={draft.wcaId}
            maxLength={10}
            placeholder="2016TORO03"
            disabled={pending}
            onChange={(e) => setDraft({ ...draft, wcaId: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`staff-email-${cardId}`}>Correo (opcional)</Label>
          <Input
            id={`staff-email-${cardId}`}
            type="email"
            value={draft.email}
            maxLength={254}
            disabled={pending}
            onChange={(e) => setDraft({ ...draft, email: e.target.value })}
          />
        </div>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-muted-foreground text-xs font-semibold uppercase">
          Actividades
        </legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {STAFF_ACTIVITIES.map((activity) => {
            const id = `staff-activity-${cardId}-${activity}`;
            return (
              <div key={activity} className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={draft.activities.includes(activity)}
                  disabled={pending}
                  onCheckedChange={(checked) =>
                    setDraft({
                      ...draft,
                      activities:
                        checked === true
                          ? [...draft.activities, activity]
                          : draft.activities.filter((a) => a !== activity),
                    })
                  }
                />
                <Label htmlFor={id} className="font-normal">
                  {STAFF_ACTIVITY_LABELS[activity]}
                </Label>
              </div>
            );
          })}
        </div>
      </fieldset>
      <p className="text-muted-foreground text-xs">
        Con el WCA ID o el correo vemos si ya completó el curso de staff.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={save}>
          {draft.memberId ? "Guardar cambios" : "Agregar"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => setDraft(null)}
        >
          Cancelar
        </Button>
      </div>
    </div>
  ) : null;

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          {heading}
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            {mode === "planning"
              ? "Registra a las personas de staff y sus actividades. Compárteles el curso de staff: su avance aparece en la tarjeta de capacitación."
              : "La misma lista de la planeación de staff, con el avance de cada persona en el curso de staff de la AMS."}
          </p>
        </div>
        {mode === "training" && course && members.length > 0 ? (
          <Badge variant={completed === members.length ? "brand" : "outline"}>
            {completed} de {members.length} completaron el curso
          </Badge>
        ) : null}
      </div>

      {course ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" asChild>
            <a href={course.url} target="_blank" rel="noreferrer">
              <ExternalLink />
              {mode === "planning" ? "Tomar el curso de Staff" : course.title}
            </a>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={copyCourseLink}
          >
            <Copy />
            Copiar enlace
          </Button>
        </div>
      ) : null}

      {mode === "planning" ? (
        <div className="space-y-1">
          <p className="text-sm">
            {activityCounts
              .map(
                ({ activity, count }) =>
                  `${STAFF_ACTIVITY_LABELS[activity]}: ${count}`,
              )
              .join(" · ")}
          </p>
          <p className="text-muted-foreground text-xs">
            Mínimo recomendado: estaciones + 4 (+4 por cada zona extra).
            Mezcladores: mínimo 2 con menos de 80 competidores, recomendable 4
            con más de 80.
          </p>
        </div>
      ) : null}

      {members.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {mode === "planning"
            ? "Aún no hay staff en la lista."
            : "Aún no hay staff en la lista. Agrégalo aquí o en la tarjeta de planeación de staff."}
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {members.map((member) => {
            const hint = mode === "training" ? courseHint(member) : null;
            return (
              <li
                key={member.id}
                className="flex flex-wrap items-start justify-between gap-3 px-3 py-2"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-medium">{member.name}</p>
                  {member.wcaId || member.email ? (
                    <p className="text-muted-foreground text-xs">
                      {[member.wcaId, member.email].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                  {member.activities.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {member.activities.map((activity) => (
                        <Badge key={activity} variant="secondary">
                          {STAFF_ACTIVITY_LABELS[activity]}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  {hint ? (
                    <p className="text-muted-foreground text-xs">{hint}</p>
                  ) : null}
                </div>
                <div className="flex items-start gap-1">
                  {mode === "training" ? (
                    <CourseStatus member={member} />
                  ) : null}
                  {!readOnly ? (
                    <>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        aria-label={`Editar a ${member.name}`}
                        disabled={pending}
                        onClick={() =>
                          setDraft({
                            memberId: member.id,
                            name: member.name,
                            wcaId: member.wcaId ?? "",
                            email: member.email ?? "",
                            activities: member.activities,
                          })
                        }
                      >
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        aria-label={`Quitar a ${member.name}`}
                        disabled={pending}
                        onClick={() => remove(member)}
                      >
                        <Trash2 />
                      </Button>
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {readOnly
        ? null
        : (form ?? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => setDraft(EMPTY_DRAFT)}
            >
              Agregar persona
            </Button>
          ))}
    </section>
  );
}
