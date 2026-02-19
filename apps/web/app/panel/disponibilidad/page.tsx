import { AvailabilityCalendarTable } from "./_components/availability-calendar-table";
import Link from "next/link";
import { buttonVariants } from "@workspace/ui/components/button";
import { Edit } from "lucide-react";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export default async function Page() {
  const delegates = await db.query.user.findMany({
    where: eq(user.role, "delegate"),
    columns: {
      wcaId: true,
      name: true,
      regionId: true,
    },
    with: {
      region: {
        columns: {
          displayName: true,
        },
      },
      availability: {
        columns: {
          date: true,
        },
        orderBy: (availability, { asc }) => [asc(availability.date)],
      },
    },
    orderBy: [asc(user.name)],
  });

  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Disponibilidad de Delegados
            </h1>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">
              Visualización de la disponibilidad de todos los delegados.
            </p>
          </div>
          <Link
            href="/panel/disponibilidad/actualizar"
            className={buttonVariants({ variant: "default" })}
          >
            <Edit />
            <span className="hidden md:inline">
              Actualizar mi disponibilidad
            </span>
          </Link>
        </div>
        <AvailabilityCalendarTable delegates={delegates} />
      </div>
    </main>
  );
}
