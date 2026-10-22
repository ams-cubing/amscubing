import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { todayInMexico } from "@workspace/db/equipment";
import {
  EQUIPMENT_ACQUISITION_KIND_LABELS,
  EQUIPMENT_CATEGORY_LABELS,
  EQUIPMENT_TRACKING_LABELS,
} from "@workspace/db/equipment-labels";

import { requireDelegate } from "@/lib/session";

import { AcquisitionForm } from "../_components/acquisition-form";
import { TypeForm } from "../_components/type-form";
import { formatEquipmentDate } from "@/lib/equipment-format";
import {
  getAcquisitions,
  getGuardians,
  getInventoryOverview,
} from "../_lib/queries";
import Loading from "../loading";

async function PageContent() {
  const session = await requireDelegate();
  const today = todayInMexico();
  const [acquisitions, guardians, { types, items }] = await Promise.all([
    getAcquisitions(),
    getGuardians(),
    getInventoryOverview(),
  ]);

  const usedTypeIds = new Set(
    acquisitions.flatMap((a) => a.lines.map((line) => line.typeId)),
  );
  const ledgerTypes = types.filter((type) => usedTypeIds.has(type.id));

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Registrar adquisición o baja</CardTitle>
          <CardDescription>
            Compras, donaciones y patrocinios dan de alta equipo (con SKU nuevo
            si se maneja por unidad). Ventas y bajas lo retiran del inventario.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {types.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Primero agrega tipos de equipo en el catálogo.
            </p>
          ) : (
            <AcquisitionForm
              types={types}
              guardians={guardians}
              items={items}
              today={today}
              defaultGuardianId={session.ok ? session.session.user.id : null}
            />
          )}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Historial de adquisiciones</h2>
        {acquisitions.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border p-6 text-sm">
            Aún no hay movimientos registrados.
          </p>
        ) : (
          <div className="bg-card overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Procedencia</TableHead>
                  <TableHead>Movimiento</TableHead>
                  {ledgerTypes.map((type) => (
                    <TableHead
                      key={type.id}
                      className="text-right"
                      title={type.name}
                    >
                      {type.skuPrefix}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {acquisitions.map((acquisition) => (
                  <TableRow key={acquisition.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatEquipmentDate(acquisition.date)}
                    </TableCell>
                    <TableCell className="max-w-md">
                      {acquisition.description}
                      {acquisition.createdByName ? (
                        <div className="text-muted-foreground text-xs">
                          Registró {acquisition.createdByName}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>{acquisition.source}</TableCell>
                    <TableCell>
                      {EQUIPMENT_ACQUISITION_KIND_LABELS[acquisition.kind]}
                    </TableCell>
                    {ledgerTypes.map((type) => {
                      const delta = acquisition.lines
                        .filter((line) => line.typeId === type.id)
                        .reduce((sum, line) => sum + line.quantityDelta, 0);
                      return (
                        <TableCell
                          key={type.id}
                          className={
                            delta < 0 ? "text-right text-red-700" : "text-right"
                          }
                        >
                          {delta === 0 ? "" : delta > 0 ? `+${delta}` : delta}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Catálogo de equipo</CardTitle>
          <CardDescription>
            El prefijo forma el SKU: prefijo, año y consecutivo (p. ej.
            DS3-2301). Los tipos por cantidad (cables, extensiones, cronómetros)
            no llevan SKU por pieza.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TypeForm />
          {types.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Prefijo</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Seguimiento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell>{type.name}</TableCell>
                    <TableCell className="font-mono">
                      {type.skuPrefix}
                    </TableCell>
                    <TableCell>
                      {EQUIPMENT_CATEGORY_LABELS[type.category]}
                    </TableCell>
                    <TableCell>
                      {EQUIPMENT_TRACKING_LABELS[type.tracking]}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Adquisiciones</h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          De dónde viene el equipo: compras, donaciones de la WCA, patrocinios,
          ventas y bajas.
        </p>
      </div>
      <Suspense fallback={<Loading />}>
        <PageContent />
      </Suspense>
    </div>
  );
}
