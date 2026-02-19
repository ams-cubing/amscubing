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
import { ClientMap } from "./_components/client-map";

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

  // Map delegates to their regions for the interactive map
  const regionsWithDelegates = regions.map((region) => ({
    ...region,
    delegates: delegates.filter((d) => d.region?.id === region.id),
  }));

  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Regiones en México</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Información sobre las regiones y delegados en México
          </p>
        </div>

        <ClientMap regionsWithDelegates={regionsWithDelegates} />

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
