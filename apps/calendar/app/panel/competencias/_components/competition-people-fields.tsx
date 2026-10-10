"use client";

import type { UseFormReturn } from "react-hook-form";
import { X } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

import type {
  CompetitionFormValues,
  DelegateOption,
} from "../_lib/competition-form-schema";
import {
  OrganizerCombobox,
  organizerSubtitle,
  type OrganizerOption,
} from "./organizer-combobox";

type Form = UseFormReturn<CompetitionFormValues>;

export function CompetitionOrganizerFields({
  form,
  selectedOrganizers,
  onAddOrganizer,
  onRemoveOrganizer,
}: {
  form: Form;
  selectedOrganizers: OrganizerOption[];
  onAddOrganizer: (organizer: OrganizerOption) => void;
  onRemoveOrganizer: (userId: string) => void;
}) {
  return (
    <>
      <FormField
        control={form.control}
        name="organizerUserIds"
        render={() => (
          <FormItem>
            <FormLabel>Organizadores</FormLabel>
            <FormDescription>
              Busca y selecciona organizadores. Si no encuentras uno, puedes
              agregarlo desde la WCA.
            </FormDescription>
            <OrganizerCombobox
              value=""
              onSelect={onAddOrganizer}
              selectedOrganizers={form.watch("organizerUserIds") || []}
              placeholder="Buscar organizador..."
            />
            {selectedOrganizers.length > 0 && (
              <div className="space-y-2 mt-4 border rounded-md p-3">
                {selectedOrganizers.map((organizer) => (
                  <div
                    key={organizer.id}
                    className="flex items-center justify-between p-2 bg-secondary/50 rounded-md"
                  >
                    <span className="text-sm">
                      {organizer.name}
                      {organizerSubtitle(organizer)
                        ? ` (${organizerSubtitle(organizer)})`
                        : ""}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveOrganizer(organizer.id)}
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
        name="primaryOrganizerUserId"
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
                  <SelectItem key={organizer.id} value={organizer.id}>
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
    </>
  );
}

export function CompetitionDelegateFields({
  form,
  delegates,
  pendingDelegateWcaIds,
}: {
  form: Form;
  delegates: DelegateOption[];
  pendingDelegateWcaIds: Set<string>;
}) {
  return (
    <>
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
                        {pendingDelegateWcaIds.has(delegate.wcaId) ? (
                          <span className="ml-2 text-xs text-amber-700 dark:text-amber-400">
                            Pendiente de confirmación
                          </span>
                        ) : null}
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
    </>
  );
}
