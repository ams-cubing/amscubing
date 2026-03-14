import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";
import * as z from "zod";
import { flagConfig } from "@/config/flag";
import { type Competition, competitions } from "@/db/schema";
import {
  getFiltersStateParser,
  getSortingStateParser,
} from "@workspace/ui/lib/parsers";

export const searchParamsCache = createSearchParamsCache({
  filterFlag: parseAsStringEnum(
    flagConfig.featureFlags.map((flag) => flag.value),
  ),
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(10),
  sort: getSortingStateParser<Competition>().withDefault([
    { id: "startDate", desc: false },
  ]),
  name: parseAsString.withDefault(""),
  delegates: parseAsArrayOf(parseAsString).withDefault([]),
  state: parseAsArrayOf(parseAsString).withDefault([]),
  statusPublic: parseAsArrayOf(
    parseAsStringEnum(competitions.statusPublic.enumValues),
  ).withDefault([]),
  statusInternal: parseAsArrayOf(
    parseAsStringEnum(competitions.statusInternal.enumValues),
  ).withDefault([]),
  createdAt: parseAsArrayOf(parseAsInteger).withDefault([]),
  // advanced filter
  filters: getFiltersStateParser().withDefault([]),
  joinOperator: parseAsStringEnum(["and", "or"]).withDefault("and"),
});

export const createCompetitionSchema = z
  .object({
    name: z.string().min(2).optional().or(z.literal("")),
    city: z.string().min(2),
    stateId: z.string().min(1),
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
    trelloUrl: z.url().optional().or(z.literal("")),
    wcaCompetitionUrl: z.url("URL inválida").optional().or(z.literal("")),
    capacity: z.number().min(2, "La capacidad debe ser al menos 2").optional(),
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
    // delegates are optional; if any are provided, a primary must be selected
    delegateWcaIds: z.array(z.string()).optional().default([]),
    primaryDelegateWcaId: z.string().optional().or(z.literal("")),
    organizerWcaIds: z
      .array(z.string())
      .min(1, "Selecciona al menos un organizador"),
    primaryOrganizerWcaId: z
      .string()
      .min(1, "Selecciona un organizador principal"),
    notes: z.string().optional().or(z.literal("")),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be after start date",
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
  .refine((data) => data.organizerWcaIds.includes(data.primaryOrganizerWcaId), {
    message: "El organizador principal debe estar en la lista de organizadores",
    path: ["primaryOrganizerWcaId"],
  });

export const updateCompetitionSchema = z
  .object({
    name: z.string().min(2).optional().or(z.literal("")),
    city: z.string().min(2),
    stateId: z.string().min(1),
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
    trelloUrl: z.url().optional().or(z.literal("")),
    wcaCompetitionUrl: z.url("URL inválida").optional().or(z.literal("")),
    capacity: z.number().min(2, "La capacidad debe ser al menos 2").optional(),
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
    delegateWcaIds: z.array(z.string()).optional().default([]),
    primaryDelegateWcaId: z.string().optional().or(z.literal("")),
    organizerWcaIds: z
      .array(z.string())
      .min(1, "Selecciona al menos un organizador"),
    primaryOrganizerWcaId: z
      .string()
      .min(1, "Selecciona un organizador principal"),
    notes: z.string().optional().or(z.literal("")),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be after start date",
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
  .refine((data) => data.organizerWcaIds.includes(data.primaryOrganizerWcaId), {
    message: "El organizador principal debe estar en la lista de organizadores",
    path: ["primaryOrganizerWcaId"],
  });
export type GetCompetitionsSchema = Awaited<
  ReturnType<typeof searchParamsCache.parse>
>;
export type CreateCompetitionSchema = z.infer<typeof createCompetitionSchema>;
export type UpdateCompetitionSchema = z.infer<typeof updateCompetitionSchema>;
