"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Calendar,
  Users,
  ExternalLink,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { cn } from "@workspace/ui/lib/utils";
import { addMonths, subDays } from "date-fns";
import {
  getPublicStatusColor,
  formatPublicStatus,
  getInternalStatusColor,
  formatInternalStatus,
} from "@/lib/utils";
import type { Competition, Holiday, Region, State } from "@workspace/db/schema";
import { Badge } from "@workspace/ui/components/badge";
import Link from "next/link";

interface FullCompetition extends Competition {
  state: State & { region: Region };
}

interface CalendarViewProps {
  competitions: FullCompetition[];
  holidays: Holiday[];
  availability: {
    date: string;
  }[];
  role: "delegate" | "user" | undefined;
}

export function CalendarView({
  competitions,
  holidays,
  availability,
  role,
}: CalendarViewProps) {
  const availableDates = availability.map((a) => {
    const [y, m, d] = a.date.split("-").map(Number);
    return new Date(y!, m! - 1, d);
  });

  const now = new Date();
  const [currentDate, setCurrentDate] = useState(() => {
    return new Date(now.getFullYear(), now.getMonth() + 3, 1);
  });
  const [selectedCompetition, setSelectedCompetition] =
    useState<FullCompetition | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = (firstDay.getDay() + 6) % 7;

  const minDate = subDays(addMonths(new Date(), 3), 1);
  const maxDate = availableDates[availableDates.length - 1];

  const getHolidayForDay = (day: number) => {
    return holidays.find((holiday) => {
      const [holidayYear, holidayMonth, holidayDay] = holiday.date
        .split("-")
        .map(Number);
      return (
        holidayDay === day &&
        holidayMonth! - 1 === month &&
        holidayYear === year
      );
    });
  };

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getCompetitionsForDay = (day: number) => {
    const dateStart = new Date(year, month, day, 0, 0, 0, 0);
    const dateEnd = new Date(year, month, day, 23, 59, 59, 999);

    return competitions.filter((comp) => {
      const [startYear, startMonth, startDay] = comp.startDate
        .split("-")
        .map(Number);
      const [endYear, endMonth, endDay] = comp.endDate.split("-").map(Number);

      const startDate = new Date(startYear!, startMonth! - 1, startDay);
      const endDate = new Date(endYear!, endMonth! - 1, endDay);

      return dateStart <= endDate && dateEnd >= startDate;
    });
  };

  const handleCompetitionClick = (competition: FullCompetition) => {
    setSelectedCompetition(competition);
    setIsDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year!, month! - 1, day);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getDaysCount = (startString: string, endString: string) => {
    const [sY, sM, sD] = startString.split("-").map(Number);
    const [eY, eM, eD] = endString.split("-").map(Number);
    const start = new Date(sY!, sM! - 1, sD);
    const end = new Date(eY!, eM! - 1, eD);
    const diff = Math.floor(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    return Math.max(1, diff + 1); // inclusive
  };

  const selectedCompetitionDays = selectedCompetition
    ? getDaysCount(selectedCompetition.startDate, selectedCompetition.endDate)
    : null;

  const isDateAvailable = (day: number) => {
    const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const availableDateStrings = availability.map((a) => a.date);

    return availableDateStrings.includes(dateString);
  };

  const isDateDefinitelyUnavailable = (day: number) => {
    const date = new Date(year, month, day);
    return date < minDate || (maxDate ? date > maxDate : false);
  };

  const isDateConditionallyUnavailable = (day: number) => {
    const date = new Date(year, month, day);

    if (date < minDate || (maxDate && date > maxDate)) {
      return false;
    }

    return !isDateAvailable(day);
  };

  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 3;

  const goToToday = () => {
    setCurrentDate(new Date(now.getFullYear(), now.getMonth() + 3, 1));
  };

  const isDelegate = role === "delegate";

  return (
    <>
      <div className="bg-card border rounded-lg p-4 md:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-primary">
            {monthNames[month]} {year}
          </h2>
          <div className="flex gap-2 md:gap-4">
            {!isCurrentMonth && (
              <Button onClick={goToToday}>
                <Calendar />
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={previousMonth}
                size="icon"
                disabled={
                  year === new Date().getFullYear() &&
                  month === new Date().getMonth()
                }
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                onClick={nextMonth}
                size="icon"
                disabled={year === new Date().getFullYear() + 1 && month === 11}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 md:gap-2 sm:gap-1 gap-0.5">
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center font-semibold text-xs md:text-sm text-muted-foreground pb-2 md:pb-3"
            >
              {day}
            </div>
          ))}

          {Array.from({ length: startingDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-20 md:min-h-24" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayCompetitions = getCompetitionsForDay(day);
            const holiday = getHolidayForDay(day);
            const isToday =
              day === new Date().getDate() &&
              month === new Date().getMonth() &&
              year === new Date().getFullYear();
            const definitelyUnavailable = isDateDefinitelyUnavailable(day);
            const conditionallyUnavailable =
              isDateConditionallyUnavailable(day);

            return (
              <div
                key={day}
                className={cn(
                  "min-h-20 md:min-h-24 border rounded-lg p-1.5 md:p-2 transition-colors",
                  definitelyUnavailable
                    ? "cursor-not-allowed opacity-50 bg-gray-200 dark:bg-slate-900"
                    : conditionallyUnavailable
                      ? "bg-gray-200 dark:bg-slate-900"
                      : "bg-pink-300 dark:bg-pink-900 hover:bg-pink-400 dark:hover:bg-pink-800",
                  isToday
                    ? "bg-background border-2 border-primary/50"
                    : "border-gray-300 dark:border-slate-700",
                  holiday && "bg-blue-100 dark:bg-blue-950",
                )}
              >
                <div
                  className={cn(
                    "text-xs md:text-sm font-semibold mb-1",
                    definitelyUnavailable && "text-muted-foreground",
                    conditionallyUnavailable && "text-muted-foreground",
                    isToday
                      ? "text-primary"
                      : !definitelyUnavailable &&
                          !conditionallyUnavailable &&
                          "text-gray-800 dark:text-slate-300",
                  )}
                >
                  {day}
                </div>
                {holiday && (
                  <div
                    className="text-[10px] md:text-xs text-blue-700 dark:text-blue-300 font-medium mb-1 truncate"
                    title={holiday.name}
                  >
                    {holiday.name}
                  </div>
                )}
                <div className="space-y-1">
                  {dayCompetitions.map((comp) => (
                    <div
                      key={comp.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCompetitionClick(comp);
                      }}
                      className={cn(
                        "text-[10px] md:text-xs p-1 rounded truncate cursor-pointer transition-all hover:scale-[1.02] hover:shadow-sm font-medium",
                        getPublicStatusColor(comp.statusPublic),
                      )}
                      title={`Competencia en ${comp.state.region.displayName}`}
                    >
                      {comp.statusPublic === "announced" || isDelegate
                        ? comp.name || comp.state.name
                        : comp.state.region.displayName}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {selectedCompetition?.statusPublic === "announced" ||
              isDelegate ? (
                selectedCompetition?.wcaCompetitionUrl ? (
                  <Link
                    href={selectedCompetition.wcaCompetitionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline hover:text-primary flex items-center gap-1"
                  >
                    {selectedCompetition.name}
                    <ExternalLink />
                  </Link>
                ) : (
                  selectedCompetition?.name ||
                  `Competencia en ${selectedCompetition?.state.name}`
                )
              ) : (
                `Competencia en ${selectedCompetition?.state.region.displayName}`
              )}
            </DialogTitle>
            <DialogDescription>Detalles de la competencia</DialogDescription>
          </DialogHeader>

          {selectedCompetition && (
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-semibold">Fechas</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedCompetition.startDate)}
                    {selectedCompetition.startDate !==
                      selectedCompetition.endDate && (
                      <> - {formatDate(selectedCompetition.endDate)}</>
                    )}
                    <Badge className="ml-2">
                      {selectedCompetitionDays}{" "}
                      {selectedCompetitionDays === 1 ? "día" : "días"}
                    </Badge>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-semibold">Ubicación</p>
                  <p className="text-sm text-muted-foreground">
                    {isDelegate
                      ? selectedCompetition.state.name
                      : selectedCompetition.state.region.displayName}
                  </p>
                </div>
              </div>

              {selectedCompetition.capacity > 0 && (
                <div className="flex items-start gap-2">
                  <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-semibold">Cupo</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedCompetition.capacity} participantes
                    </p>
                  </div>
                </div>
              )}

              <div>
                <p className="font-semibold mb-1">Estado</p>
                <span
                  className={cn(
                    "text-xs px-2 py-1 rounded",
                    getPublicStatusColor(selectedCompetition.statusPublic),
                  )}
                >
                  {formatPublicStatus(selectedCompetition.statusPublic)}
                </span>
              </div>

              {isDelegate && (
                <div>
                  <p className="font-semibold mb-1">Estado interno</p>
                  <span
                    className={cn(
                      "text-xs px-2 py-1 rounded",
                      getInternalStatusColor(
                        selectedCompetition.statusInternal,
                      ),
                    )}
                  >
                    {formatInternalStatus(selectedCompetition.statusInternal)}
                  </span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
