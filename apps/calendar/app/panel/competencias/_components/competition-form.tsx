"use client";

import { useState, useTransition } from "react";
import { Resolver, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { addWeeks } from "date-fns";
import { createCompetition } from "../_actions/create-competition";
import { updateCompetition } from "../_actions/update-competition";
import { toast } from "sonner";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { useRouter } from "next/navigation";
import { type OrganizerOption } from "./organizer-combobox";
import { BoardAssignControls } from "./board-assign-controls";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  competitionSchema,
  type CompetitionFormValues,
  type DelegateOption,
  type FullCompetition,
} from "../_lib/competition-form-schema";
import {
  CompetitionDatesField,
  CompetitionLocationFields,
} from "./competition-location-fields";
import { CompetitionStatusFields } from "./competition-status-fields";
import {
  CompetitionDelegateFields,
  CompetitionOrganizerFields,
} from "./competition-people-fields";

export function CompetitionForm({
  delegates,
  competition,
}: {
  delegates: DelegateOption[];
  competition?: FullCompetition;
}) {
  const [pending, startTransition] = useTransition();
  const [selectedOrganizers, setSelectedOrganizers] = useState<
    OrganizerOption[]
  >(() => competition?.organizers.map((o) => o.organizer) ?? []);
  const isEditing = !!competition;
  const minDate = addWeeks(new Date(), 5);

  const router = useRouter();

  const pendingDelegateWcaIds = new Set(
    (competition?.delegates ?? [])
      .filter((d) => d.status === "pending")
      .map((d) => d.delegateWcaId),
  );

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
          organizerUserIds: competition.organizers.map(
            (o) => o.organizerUserId,
          ),
          primaryOrganizerUserId:
            competition.organizers.find((o) => o.isPrimary)?.organizerUserId ||
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
          capacity: 50,
          statusPublic: "reserved",
          statusInternal: "looking_for_venue",
          notes: "",
          delegateWcaIds: [],
          primaryDelegateWcaId: "",
          organizerUserIds: [],
          primaryOrganizerUserId: "",
          assignBoard: true,
        },
  });

  const handleAddOrganizer = (organizer: OrganizerOption) => {
    const current = form.getValues("organizerUserIds") || [];
    if (!current.includes(organizer.id)) {
      form.setValue("organizerUserIds", [...current, organizer.id]);
      setSelectedOrganizers((prev) => [...prev, organizer]);
    }
  };

  const handleRemoveOrganizer = (userId: string) => {
    const current = form.getValues("organizerUserIds") || [];
    form.setValue(
      "organizerUserIds",
      current.filter((id) => id !== userId),
    );
    setSelectedOrganizers((prev) => prev.filter((org) => org.id !== userId));

    // Clear primary organizer if it was the removed one
    if (form.getValues("primaryOrganizerUserId") === userId) {
      form.setValue("primaryOrganizerUserId", "");
    }
  };

  async function onSubmit(data: CompetitionFormValues) {
    startTransition(async () => {
      try {
        const { assignBoard, capacity, ...fields } = data;
        const rest = { ...fields, capacity: capacity ?? undefined };
        const result = isEditing
          ? await updateCompetition(competition.id, rest)
          : await createCompetition({ ...rest, assignBoard });

        if (result.success) {
          if (
            !isEditing &&
            result.message?.includes("no se pudo asignar el tablero")
          ) {
            toast.warning(result.message);
          } else {
            toast.success(
              result.message ||
                `Competencia ${isEditing ? "actualizada" : "creada"} exitosamente`,
            );
          }

          const id = result.competitionId ?? competition?.id;
          router.push(id ? `/panel/competencias/${id}` : "/panel/competencias");
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
        <CompetitionLocationFields form={form} />

        <CompetitionDatesField
          form={form}
          isEditing={isEditing}
          minDate={minDate}
        />

        {isEditing && competition && (
          <BoardAssignControls
            competitionId={competition.id}
            boardId={competition.boardId}
          />
        )}

        {!isEditing && (
          <FormField
            control={form.control}
            name="assignBoard"
            render={({ field }) => (
              <div className="space-y-2 rounded-lg border p-4">
                <div className="text-sm font-medium">Tablero AMS</div>
                <p className="text-sm text-muted-foreground">
                  Se clonará la plantilla AMS estándar para los organizadores.
                </p>
                <FormItem className="flex flex-row items-start gap-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Crear tablero AMS automáticamente</FormLabel>
                  </div>
                </FormItem>
              </div>
            )}
          />
        )}

        {(isEditing || !form.watch("assignBoard")) && (
          <FormField
            control={form.control}
            name="trelloUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL de Trello (legado)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://trello.com/b/..."
                    type="url"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Opcional
                  {isEditing
                    ? ". Usa el tablero AMS arriba cuando sea posible."
                    : ". Solo si no usas tablero AMS."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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
                    field.onChange(val === "" ? null : Number(val));
                  }}
                />
              </FormControl>
              <FormDescription>Opcional. Mínimo 10</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <CompetitionStatusFields form={form} />

        <CompetitionOrganizerFields
          form={form}
          selectedOrganizers={selectedOrganizers}
          onAddOrganizer={handleAddOrganizer}
          onRemoveOrganizer={handleRemoveOrganizer}
        />

        <CompetitionDelegateFields
          form={form}
          delegates={delegates}
          pendingDelegateWcaIds={pendingDelegateWcaIds}
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
