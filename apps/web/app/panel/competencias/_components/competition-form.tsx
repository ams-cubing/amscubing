"use client";

import { useEffect, useState, useTransition } from "react";
import { Resolver, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@workspace/ui/components/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Calendar } from "@workspace/ui/components/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { CalendarIcon, X } from "lucide-react";
import { addWeeks, format } from "date-fns";
import { cn } from "@workspace/ui/lib/utils";
import { createCompetition } from "../_actions/create-competition";
import { updateCompetition } from "../_actions/update-competition";
import { toast } from "sonner";
import { es } from "react-day-picker/locale";
import type { DateRange } from "react-day-picker";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { useRouter } from "next/navigation";
import { OrganizerCombobox } from "./organizer-combobox";
import { searchUsers } from "../_actions/wca-users";
import { MEXICAN_STATES } from "@/lib/constants";
import { Competition } from "@/db/schema";
import { Textarea } from "@workspace/ui/components/textarea";

function getPublicStatusColor(status: Competition["statusPublic"]): string {
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

const competitionSchema = z
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
    notes: z.string().optional().or(z.literal("")),
    // delegates are optional; if any are provided, a primary must be selected
    delegateWcaIds: z.array(z.string()).optional().default([]),
    primaryDelegateWcaId: z.string().optional().or(z.literal("")),
    organizerWcaIds: z
      .array(z.string())
      .min(1, "Selecciona al menos un organizador"),
    primaryOrganizerWcaId: z
      .string()
      .min(1, "Selecciona un organizador principal"),
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
  .refine((data) => data.organizerWcaIds.includes(data.primaryOrganizerWcaId), {
    message: "El organizador principal debe estar en la lista de organizadores",
    path: ["primaryOrganizerWcaId"],
  });

type CompetitionFormValues = z.infer<typeof competitionSchema>;

const PUBLIC_STATUSES = [
  // { value: "open", label: "Abierto" },
  { value: "reserved", label: "Fecha reservada" },
  { value: "confirmed", label: "Sede confirmada" },
  { value: "announced", label: "Anunciada" },
  { value: "suspended", label: "Suspendida" },
  // { value: "unavailable", label: "No disponible" },
];

const INTERNAL_STATUSES = [
  { value: "asked_for_help", label: "Pidiendo ayuda" },
  { value: "looking_for_venue", label: "Buscando sede" },
  { value: "venue_found", label: "Sede encontrada" },
  { value: "wca_approved", label: "Aprobada por la WCA" },
  { value: "registration_open", label: "Registro abierto" },
  { value: "celebrated", label: "Celebrada" },
  { value: "cancelled", label: "Cancelada" },
];

interface FullCompetition extends Competition {
  delegates: {
    delegateWcaId: string;
    isPrimary: boolean;
  }[];
  organizers: {
    organizerWcaId: string;
    isPrimary: boolean;
  }[];
}

export function CompetitionForm({
  delegates,
  competition,
}: {
  delegates: { wcaId: string; name: string; regionId: string | null }[];
  competition?: FullCompetition;
}) {
  const [pending, startTransition] = useTransition();
  const [selectedOrganizers, setSelectedOrganizers] = useState<
    { wcaId: string; name: string }[]
  >([]);
  const isEditing = !!competition;

  const minDate = addWeeks(new Date(), 5);

  const router = useRouter();

  const form = useForm<CompetitionFormValues>({
    resolver: zodResolver(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      competitionSchema as any,
    ) as unknown as Resolver<CompetitionFormValues>,
    defaultValues: competition
      ? {
          name: competition.name || "",
          city: competition.city,
          stateId: competition.stateId,
          startDate: new Date(competition.startDate + "T00:00:00"),
          endDate: new Date(competition.endDate + "T00:00:00"),
          trelloUrl: competition.trelloUrl || "",
          wcaCompetitionUrl: competition.wcaCompetitionUrl || "",
          capacity: competition.capacity || 0,
          statusPublic: competition.statusPublic,
          statusInternal: competition.statusInternal,
          notes: competition.notes || "",
          delegateWcaIds: competition.delegates.map((d) => d.delegateWcaId),
          primaryDelegateWcaId:
            competition.delegates.find((d) => d.isPrimary)?.delegateWcaId || "",
          organizerWcaIds: competition.organizers.map((o) => o.organizerWcaId),
          primaryOrganizerWcaId:
            competition.organizers.find((o) => o.isPrimary)?.organizerWcaId ||
            "",
        }
      : {
          name: "",
          city: "",
          stateId: "",
          startDate: undefined,
          endDate: undefined,
          trelloUrl: "",
          wcaCompetitionUrl: "",
          capacity: 10,
          statusPublic: "reserved",
          statusInternal: "looking_for_venue",
          notes: "",
          delegateWcaIds: [],
          primaryDelegateWcaId: "",
          organizerWcaIds: [],
          primaryOrganizerWcaId: "",
        },
  });

  useEffect(() => {
    if (competition && competition.organizers.length > 0) {
      const loadOrganizers = async () => {
        const organizerDetails = await Promise.all(
          competition.organizers.map(async (org) => {
            const users = await searchUsers(org.organizerWcaId);
            const user = users.find((u) => u.wcaId === org.organizerWcaId);
            return user
              ? { wcaId: user.wcaId, name: user.name }
              : { wcaId: org.organizerWcaId, name: org.organizerWcaId };
          }),
        );
        setSelectedOrganizers(organizerDetails);
      };
      loadOrganizers();
    }
  }, [competition]);

  const handleAddOrganizer = async (wcaId: string) => {
    const current = form.getValues("organizerWcaIds") || [];
    if (!current.includes(wcaId)) {
      form.setValue("organizerWcaIds", [...current, wcaId]);

      // Fetch organizer details
      const users = await searchUsers(wcaId);
      const user = users.find((u) => u.wcaId === wcaId);

      if (user) {
        setSelectedOrganizers((prev) => [
          ...prev,
          { wcaId: user.wcaId, name: user.name },
        ]);
      }
    }
  };

  const handleRemoveOrganizer = (wcaId: string) => {
    const current = form.getValues("organizerWcaIds") || [];
    form.setValue(
      "organizerWcaIds",
      current.filter((id) => id !== wcaId),
    );
    setSelectedOrganizers((prev) => prev.filter((org) => org.wcaId !== wcaId));

    // Clear primary organizer if it was the removed one
    if (form.getValues("primaryOrganizerWcaId") === wcaId) {
      form.setValue("primaryOrganizerWcaId", "");
    }
  };

  async function onSubmit(data: CompetitionFormValues) {
    startTransition(async () => {
      try {
        const result = isEditing
          ? await updateCompetition(competition.id, data)
          : await createCompetition(data);

        if (result.success) {
          toast.success(
            result.message ||
              `Competencia ${isEditing ? "actualizada" : "creada"} exitosamente`,
          );

          router.push("/panel");
        } else {
          toast.error(
            result.message ||
              `Error al ${isEditing ? "actualizar" : "crear"} la competencia`,
          );
        }
      } catch {
        toast.error(
          `Error al ${isEditing ? "actualizar" : "crear"} la competencia`,
        );
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la competencia</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Guadalajara Open 2026" {...field} />
              </FormControl>
              <FormDescription>
                Déjalo en blanco si aún no tienes un nombre
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ciudad</FormLabel>
                <FormControl>
                  <Input placeholder="Guadalajara" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="stateId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona un estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MEXICAN_STATES.map((state) => (
                      <SelectItem key={state.id} value={state.id}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormItem className="flex flex-col">
          <FormLabel>Fechas</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  data-invalid={
                    !!form.formState.errors.startDate ||
                    !!form.formState.errors.endDate
                  }
                  className={cn(
                    "w-full pl-3 text-left font-normal data-[invalid=true]:ring-2 data-[invalid=true]:ring-destructive/20 dark:data-[invalid=true]:ring-destructive/40 data-[invalid=true]:border-destructive",
                    !form.watch("startDate") && "text-muted-foreground",
                  )}
                >
                  {form.watch("startDate") && form.watch("endDate") ? (
                    <>
                      {format(form.watch("startDate"), "PPP", { locale: es })} -{" "}
                      {format(form.watch("endDate"), "PPP", { locale: es })}
                    </>
                  ) : (
                    <span>Selecciona la fecha</span>
                  )}
                  <CalendarIcon className="ml-auto opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{
                  from: form.watch("startDate"),
                  to: form.watch("endDate"),
                }}
                onSelect={(range: DateRange | undefined) => {
                  if (range?.from) {
                    form.setValue("startDate", range.from);
                  }
                  if (range?.to) {
                    form.setValue("endDate", range.to);
                  }
                }}
                disabled={(date) => !isEditing && date < minDate}
                // modifiers={{
                //   unavailable: availableDates,
                // }}
                modifiersClassNames={{
                  unavailable: "[&>button]:line-through opacity-100",
                }}
                autoFocus
                locale={es}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <FormMessage>
            {form.formState.errors.startDate?.message ||
              form.formState.errors.endDate?.message}
          </FormMessage>
        </FormItem>

        <FormField
          control={form.control}
          name="trelloUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL de Trello</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://trello.com/b/..."
                  type="url"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="wcaCompetitionUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL de la WCA</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://www.worldcubeassociation.org/competitions/..."
                  type="url"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="capacity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Capacidad</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Número máximo de participantes"
                  min={10}
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    field.onChange(val === "" ? undefined : Number(val));
                  }}
                />
              </FormControl>
              <FormDescription>Opcional. Mínimo 10</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="statusPublic"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado público</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PUBLIC_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        <span
                          className={cn(
                            "rounded-full size-2",
                            getPublicStatusColor(
                              status.value as Competition["statusPublic"],
                            ),
                          )}
                        />
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="statusInternal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado interno</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {INTERNAL_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="organizerWcaIds"
          render={() => (
            <FormItem>
              <FormLabel>Organizadores</FormLabel>
              <FormDescription>
                Busca y selecciona organizadores. Si no encuentras uno, puedes
                agregarlo desde la WCA.
              </FormDescription>
              <OrganizerCombobox
                value=""
                onValueChange={handleAddOrganizer}
                selectedOrganizers={form.watch("organizerWcaIds") || []}
                placeholder="Buscar organizador..."
              />
              {selectedOrganizers.length > 0 && (
                <div className="space-y-2 mt-4 border rounded-md p-3">
                  {selectedOrganizers.map((organizer) => (
                    <div
                      key={organizer.wcaId}
                      className="flex items-center justify-between p-2 bg-secondary/50 rounded-md"
                    >
                      <span className="text-sm">
                        {organizer.name} ({organizer.wcaId})
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveOrganizer(organizer.wcaId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="primaryOrganizerWcaId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organizador principal</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el organizador principal" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {selectedOrganizers.map((organizer) => (
                    <SelectItem key={organizer.wcaId} value={organizer.wcaId}>
                      {organizer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Debe ser uno de los organizadores seleccionados arriba
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="delegateWcaIds"
          render={() => (
            <FormItem>
              <FormLabel>Delegados</FormLabel>
              <FormDescription>
                Selecciona uno o más delegados para esta competencia
              </FormDescription>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                {delegates.map((delegate) => (
                  <FormField
                    key={delegate.wcaId}
                    control={form.control}
                    name="delegateWcaIds"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(delegate.wcaId)}
                            onCheckedChange={(checked) => {
                              const value = field.value || [];
                              if (checked) {
                                field.onChange([...value, delegate.wcaId]);
                              } else {
                                field.onChange(
                                  value.filter((id) => id !== delegate.wcaId),
                                );
                              }
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          {delegate.name} ({delegate.wcaId})
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="primaryDelegateWcaId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Delegado principal</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el delegado principal" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {form
                    .watch("delegateWcaIds")
                    ?.map((wcaId) => delegates.find((d) => d.wcaId === wcaId))
                    .filter(Boolean)
                    .map((delegate) => (
                      <SelectItem key={delegate!.wcaId} value={delegate!.wcaId}>
                        {delegate?.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Debe ser uno de los delegados seleccionados arriba
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ej. Información adicional sobre la competencia"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={pending}>
          {pending
            ? isEditing
              ? "Actualizando..."
              : "Creando..."
            : isEditing
              ? "Actualizar Competencia"
              : "Crear Competencia"}
        </Button>
      </form>
    </Form>
  );
}
