import { z } from "zod";
import type { Competition } from "@workspace/db/schema";

import type { OrganizerOption } from "../_components/organizer-combobox";

export function getPublicStatusColor(
  status: Competition["statusPublic"],
): string {
  switch (status) {
    case "open":
      return "bg-pink-300 dark:bg-pink-600";
    case "reserved":
      return "bg-yellow-300 dark:bg-yellow-600";
    case "confirmed":
      return "bg-orange-300 dark:bg-orange-600";
    case "announced":
      return "bg-green-300 dark:bg-green-600";
    case "suspended":
      return "bg-red-400 dark:bg-red-700";
    case "unavailable":
    default:
      return "bg-gray-400 dark:bg-gray-700";
  }
}

export const competitionSchema = z
  .object({
    name: z
      .string()
      .min(2, "El nombre de la competencia es requerido")
      .optional()
      .or(z.literal("")),
    city: z.string().min(2, "El nombre de la ciudad es requerido"),
    stateId: z.string().min(1, "El estado es requerido"),
    startDate: z.date({
      error: (issue) =>
        issue.input === undefined
          ? "Fecha de inicio requerida"
          : "Fecha inválida",
    }),
    endDate: z.date({
      error: (issue) =>
        issue.input === undefined ? "Fecha de fin requerida" : "Fecha inválida",
    }),
    trelloUrl: z.url("URL inválida").optional().or(z.literal("")),
    wcaCompetitionUrl: z.url("URL inválida").optional().or(z.literal("")),
    capacity: z
      .number()
      .min(2, "La capacidad debe ser al menos 2")
      .nullable()
      .optional(),
    statusPublic: z.enum([
      "open",
      "reserved",
      "confirmed",
      "announced",
      "suspended",
      "unavailable",
    ]),
    statusInternal: z.enum([
      "asked_for_help",
      "looking_for_venue",
      "venue_found",
      "wca_approved",
      "registration_open",
      "celebrated",
      "cancelled",
    ]),
    notes: z.string().optional().or(z.literal("")),
    // delegates are optional; if any are provided, a primary must be selected
    delegateWcaIds: z.array(z.string()).optional().default([]),
    primaryDelegateWcaId: z.string().optional().or(z.literal("")),
    organizerUserIds: z
      .array(z.string())
      .min(1, "Selecciona al menos un organizador"),
    primaryOrganizerUserId: z
      .string()
      .min(1, "Selecciona un organizador principal"),
    assignBoard: z.boolean().optional().default(false),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "La fecha de fin debe ser posterior o igual a la fecha de inicio",
    path: ["endDate"],
  })
  // If there are delegates selected, primaryDelegateWcaId must be set and included in the list
  .refine(
    (data) => {
      const delegates = data.delegateWcaIds || [];
      if (delegates.length === 0) return true;
      return (
        !!data.primaryDelegateWcaId &&
        delegates.includes(data.primaryDelegateWcaId)
      );
    },
    {
      message: "Selecciona un delegado principal",
      path: ["primaryDelegateWcaId"],
    },
  )
  .refine(
    (data) => data.organizerUserIds.includes(data.primaryOrganizerUserId),
    {
      message:
        "El organizador principal debe estar en la lista de organizadores",
      path: ["primaryOrganizerUserId"],
    },
  )
  .refine(
    (data) =>
      data.statusPublic !== "announced" ||
      Boolean(data.wcaCompetitionUrl?.trim()),
    {
      message:
        "La URL de la WCA es obligatoria para anunciar (se publica en Torneo de Rubik)",
      path: ["wcaCompetitionUrl"],
    },
  );

export type CompetitionFormValues = z.infer<typeof competitionSchema>;

export const PUBLIC_STATUSES = [
  // { value: "open", label: "Abierto" },
  { value: "reserved", label: "Fecha reservada" },
  { value: "confirmed", label: "Sede confirmada" },
  { value: "announced", label: "Anunciada" },
  { value: "suspended", label: "Suspendida" },
  // { value: "unavailable", label: "No disponible" },
];

export const INTERNAL_STATUSES = [
  { value: "asked_for_help", label: "Pidiendo ayuda" },
  { value: "looking_for_venue", label: "Buscando sede" },
  { value: "venue_found", label: "Sede encontrada" },
  { value: "wca_approved", label: "Aprobada por la WCA" },
  { value: "registration_open", label: "Registro abierto" },
  { value: "celebrated", label: "Celebrada" },
  { value: "cancelled", label: "Cancelada" },
];

export interface FullCompetition extends Competition {
  delegates: {
    delegateWcaId: string;
    isPrimary: boolean;
    status?: "pending" | "accepted" | "declined";
  }[];
  organizers: {
    organizerUserId: string;
    isPrimary: boolean;
    organizer: OrganizerOption;
  }[];
}

export type DelegateOption = {
  wcaId: string;
  name: string;
  regionId: string | null;
};
