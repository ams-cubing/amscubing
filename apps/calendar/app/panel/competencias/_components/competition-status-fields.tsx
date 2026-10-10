"use client";

import type { UseFormReturn } from "react-hook-form";
import {
  FormControl,
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
import { cn } from "@workspace/ui/lib/utils";
import type { Competition } from "@workspace/db/schema";

import {
  getPublicStatusColor,
  INTERNAL_STATUSES,
  PUBLIC_STATUSES,
  type CompetitionFormValues,
} from "../_lib/competition-form-schema";

export function CompetitionStatusFields({
  form,
}: {
  form: UseFormReturn<CompetitionFormValues>;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <FormField
        control={form.control}
        name="statusPublic"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Estado público</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
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
            <Select onValueChange={field.onChange} value={field.value}>
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
  );
}
