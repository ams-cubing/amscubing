import Link from "next/link";

import { getCalendarUrl } from "@/lib/urls";

export function BoardsAccessDenied() {
  const calendarUrl = getCalendarUrl();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-start justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Acceso restringido
      </h1>
      <p className="text-muted-foreground">
        Tableros AMS es para delegados y organizadores de competencias. Si
        organizas una competencia, pide a tu delegado que te agregue como
        organizador.
      </p>
      <Link
        href={calendarUrl}
        className="text-sm font-medium text-primary hover:underline"
      >
        Volver al calendario
      </Link>
    </div>
  );
}
