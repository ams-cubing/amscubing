import { Suspense } from "react";
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
import Loading from "./loading";
import { PublicPageShell } from "../_components/public-page-shell";
import { getDelegatesWithRegions, getRegionsWithStates } from "./_lib/queries";

async function PageContent() {
  const [delegates, regions] = await Promise.all([
    getDelegatesWithRegions(),
    getRegionsWithStates(),
  ]);

  // Map delegates to their regions for the interactive map
  const regionsWithDelegates = regions.map((region) => ({
    ...region,
    delegates: delegates.filter((d) => d.region?.id === region.id),
  }));

  return (
    <PublicPageShell
      title="Regiones en México"
      description="Regiones, estados y delegados sugeridos para cada zona del país."
    >
      <ClientMap regionsWithDelegates={regionsWithDelegates} />

      <section className="rounded-3xl border border-black/10 p-4 md:p-6">
        <h2 className="ams-display mb-4 text-2xl leading-none md:text-3xl">
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

      <section className="rounded-3xl border border-black/10 p-4 md:p-6">
        <h2 className="ams-display mb-4 text-2xl leading-none md:text-3xl">
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
    </PublicPageShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <PageContent />
    </Suspense>
  );
}
