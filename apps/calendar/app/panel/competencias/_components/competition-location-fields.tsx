"use client";

import type { UseFormReturn } from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { es } from "react-day-picker/locale";
import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { cn } from "@workspace/ui/lib/utils";
import { MEXICAN_STATES } from "@workspace/db/data/mexico";

import type { CompetitionFormValues } from "../_lib/competition-form-schema";

type Form = UseFormReturn<CompetitionFormValues>;

export function CompetitionLocationFields({ form }: { form: Form }) {
  return (
    <>
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
              <Select onValueChange={field.onChange} value={field.value}>
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
    </>
  );
}

export function CompetitionDatesField({
  form,
  isEditing,
  minDate,
}: {
  form: Form;
  isEditing: boolean;
  minDate: Date;
}) {
  return (
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
  );
}
