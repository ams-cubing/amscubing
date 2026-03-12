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
import { CalendarIcon } from "lucide-react";
import { addMonths, format } from "date-fns";
import { cn } from "@workspace/ui/lib/utils";
import { submitDateRequest } from "../_actions/submit-date-request";
import { toast } from "sonner";
import { es } from "react-day-picker/locale";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DateRange } from "react-day-picker";
import { MEXICAN_STATES } from "@/lib/constants";

const dateRequestSchema = z
  .object({
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
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "La fecha de fin debe ser posterior o igual a la fecha de inicio",
    path: ["endDate"],
  });

type DateRequestFormValues = z.infer<typeof dateRequestSchema>;

export function DateRequestForm({
  availability,
}: {
  availability: {
    date: string;
  }[];
}) {
  // parse YYYY-MM-DD into a local Date at midnight (avoid timezone shifts)
  const parseDateStringToLocal = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y!, m! - 1, d);
  };

  const availableDates = availability.map((a) =>
    parseDateStringToLocal(a.date),
  );

  const makeDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;

  const availableDateKeys = new Set(availableDates.map(makeDateKey));

  const [pending, startTransition] = useTransition();

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const state = searchParams.get("estado");

  const minDate = addMonths(new Date(), 3);
  const maxDate =
    availableDates.length > 0
      ? new Date(Math.max(...availableDates.map((d) => d.getTime())))
      : undefined;

  // normalize min/max to midnight
  minDate.setHours(0, 0, 0, 0);
  if (maxDate) maxDate.setHours(0, 0, 0, 0);

  const form = useForm<DateRequestFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(dateRequestSchema as any),
    defaultValues: {
      city: "",
      stateId: state || "",
      startDate: undefined,
      endDate: undefined,
    },
  });

  const stateSelected = Boolean(form.watch("stateId"));

  async function onSubmit(data: DateRequestFormValues) {
    startTransition(async () => {
      try {
        const result = await submitDateRequest(data);

        if (result.success) {
          toast.success(result.message || "Solicitud enviada exitosamente");

          router.push("/");
        } else {
          toast.error(result.message || "Error al enviar la solicitud");
        }
      } catch {
        toast.error("Error al enviar la solicitud");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="stateId"
          render={({ field }) => (
            <FormItem className="flex flex-col items-start">
              <FormLabel>Estado</FormLabel>
              <Select
                onValueChange={(value) => {
                  // update form state
                  field.onChange(value);
                  // reflect selection in URL (estado)
                  const params = new URLSearchParams(
                    searchParams?.toString() || "",
                  );
                  if (!value) params.delete("estado");
                  else params.set("estado", value);
                  const q = params.toString();
                  router.replace(`${pathname}${q ? `?${q}` : ""}`);
                }}
                defaultValue={field.value}
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

        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem className="flex flex-col items-start">
              <FormLabel>Ciudad</FormLabel>
              <FormControl>
                <Input placeholder="Guadalajara" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem className="flex flex-col">
          <FormLabel>Fechas</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  disabled={!stateSelected}
                  data-invalid={
                    !!form.formState.errors.startDate ||
                    !!form.formState.errors.endDate
                  }
                  className={cn(
                    "w-full pl-3 text-left font-normal data-[invalid=true]:ring-2 data-[invalid=true]:ring-destructive/20 dark:data-[invalid=true]:ring-destructive/40 data-[invalid=true]:border-destructive",
                    (!form.watch("startDate") || !stateSelected) &&
                      "text-muted-foreground",
                  )}
                >
                  {form.watch("startDate") && form.watch("endDate") ? (
                    <>
                      {format(form.watch("startDate"), "PPP", { locale: es })} -{" "}
                      {format(form.watch("endDate"), "PPP", { locale: es })}
                    </>
                  ) : (
                    <span>
                      {stateSelected
                        ? "Selecciona la fecha"
                        : "Selecciona un estado primero"}
                    </span>
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
                  if (!stateSelected) return;
                  if (range?.from) {
                    form.setValue("startDate", range.from);
                  }
                  if (range?.to) {
                    form.setValue("endDate", range.to);
                  }
                }}
                disabled={(date) => {
                  if (!stateSelected) return true;
                  const key = makeDateKey(date);
                  if (!availableDateKeys.has(key)) return true;
                  if (date < minDate) return true;
                  if (maxDate && date > maxDate) return true;
                  return false;
                }}
                modifiers={
                  {
                    // unavailable: unavailableDates,
                  }
                }
                modifiersClassNames={{
                  unavailable: "[&>button]:line-through opacity-100",
                }}
                autoFocus
                locale={es}
                numberOfMonths={2}
                defaultMonth={minDate}
              />
            </PopoverContent>
          </Popover>
          <FormMessage>
            {form.formState.errors.startDate?.message ||
              form.formState.errors.endDate?.message}
          </FormMessage>
        </FormItem>

        <Button
          type="submit"
          className="w-full"
          disabled={pending || !stateSelected}
        >
          {pending ? "Enviando..." : "Enviar Solicitud"}
        </Button>
      </form>
    </Form>
  );
}
