"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@workspace/ui/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Calendar } from "@workspace/ui/components/calendar";
import { toast } from "sonner";
import { es } from "react-day-picker/locale";
import { submitAvailability } from "../_actions/submit-availability";
import { addWeeks } from "date-fns";

const availabilitySchema = z.object({
  dates: z.array(z.date()),
});

type AvailabilityFormValues = z.infer<typeof availabilitySchema>;

interface AvailabilityFormProps {
  availabilityDates: { date: string }[];
  busyDays: string[];
}

export function AvailabilityForm({
  availabilityDates,
  busyDays,
}: AvailabilityFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<AvailabilityFormValues>({
    resolver: zodResolver(availabilitySchema),
    defaultValues: {
      dates: availabilityDates.map((d) => {
        const [year, month, day] = d.date.split("-").map(Number);
        const date = new Date(year!, month! - 1, day);
        return date;
      }),
    },
  });

  const unavailableDays = busyDays.map((dateStr) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year!, month! - 1, day);
  });

  async function onSubmit(data: AvailabilityFormValues) {
    startTransition(async () => {
      try {
        const result = await submitAvailability(data);

        if (result.success) {
          toast.success(
            result.message || "Disponibilidad registrada exitosamente",
          );
          form.reset({ dates: data.dates });
        } else {
          toast.error(result.message || "Error al registrar la disponibilidad");
        }
      } catch {
        toast.error("Error al registrar la disponibilidad");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="dates"
          render={({ field }) => (
            <FormItem className="flex flex-col items-center">
              <FormLabel className="sr-only">
                Fechas de disponibilidad
              </FormLabel>
              <div className="rounded-md border p-4 bg-popover">
                <FormControl>
                  <Calendar
                    mode="multiple"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={[
                      ...unavailableDays,
                      (date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const fiveWeeksFromNow = addWeeks(today, 5);
                        return date <= fiveWeeksFromNow;
                      },
                    ]}
                    locale={es}
                    numberOfMonths={2}
                    modifiers={{
                      unavailable: unavailableDays,
                    }}
                    modifiersClassNames={{
                      unavailable: "[&>button]:line-through opacity-100",
                    }}
                    className="p-0"
                    defaultMonth={addWeeks(new Date(), 3)}
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col gap-4">
          <div className="text-sm text-muted-foreground text-center">
            {form.watch("dates")?.length > 0
              ? `${form.watch("dates").length} fecha(s) seleccionada(s)`
              : "Sin fechas seleccionadas (se borrará tu disponibilidad)"}
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending
              ? "Guardando..."
              : form.watch("dates")?.length === 0
                ? "Borrar Disponibilidad"
                : "Registrar Disponibilidad"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
