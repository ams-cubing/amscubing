import { db } from "@/db";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import Image from "next/image";

export default async function Page() {
  const delegates = await db.query.user.findMany({
    orderBy: (t, { asc }) => [asc(t.name)],
    where: (t, { eq }) => eq(t.role, "delegate"),
    with: {
      region: true,
    },
  });

  const regions = await db.query.regions.findMany({
    orderBy: (t, { asc }) => [asc(t.displayName)],
    with: {
      states: true,
    },
  });

  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Regiones en México</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Información sobre las regiones y delegados en México
          </p>
        </div>

        <section className="bg-card border rounded-lg p-4 md:p-6 shadow-sm">
          <div className="flex justify-center">
            <Image
              src="/mapa.png"
              alt="Mapa de regiones en México"
              width={736}
              height={491}
              className="rounded-lg shadow-md max-w-full h-auto"
            />
          </div>
        </section>

        <section className="bg-card border rounded-lg p-4 md:p-6 shadow-sm">
          <h2 className="text-lg md:text-xl font-semibold mb-4">
            Delegados sugeridos para cada región de México
          </h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16" />
                  <TableHead>Nombre</TableHead>
                  <TableHead>Región</TableHead>
                  <TableHead>Correo Electrónico</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {delegates.map((delegate) => (
                  <TableRow key={delegate.id}>
                    <TableCell>
                      <Avatar>
                        <AvatarImage
                          src={delegate.image || undefined}
                          alt={delegate.name}
                        />
                        <AvatarFallback>
                          {delegate.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <a
                        href={`https://www.worldcubeassociation.org/persons/${delegate.wcaId}`}
                        className="font-medium hover:text-primary transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {delegate.name}
                      </a>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {delegate.region?.displayName || "N/A"}
                    </TableCell>
                    <TableCell>
                      <a
                        href={`mailto:${delegate.email}`}
                        className="text-primary hover:underline transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {delegate.email}
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="bg-card border rounded-lg p-4 md:p-6 shadow-sm">
          <h2 className="text-lg md:text-xl font-semibold mb-4">
            Estados que comprenden cada región
          </h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3">Región</TableHead>
                  <TableHead>Estados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regions.map((region) => (
                  <TableRow key={region.id}>
                    <TableCell className="font-medium">
                      {region.displayName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {region.states.map((state) => state.name).join(", ")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </main>
  );
}
