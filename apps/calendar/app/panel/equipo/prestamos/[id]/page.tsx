import { FileDown } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { SearchParamToast } from "@workspace/ui/components/search-param-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

import {
  EquipmentStatusBadge,
  LoanStatusBadge,
} from "../../_components/badges";
import { EventTimeline } from "../../_components/event-timeline";
import { Person } from "../../_components/person";
import { ReturnForm } from "../../_components/return-form";
import { formatEquipmentDate } from "@/lib/equipment-format";
import { getLoanDetail } from "../../_lib/queries";
import Loading from "../../loading";

type PageProps = { params: Promise<{ id: string }> };

async function PageContent({ params }: PageProps) {
  const { id } = await params;
  const loanId = Number(id);
  if (!Number.isInteger(loanId) || loanId <= 0) notFound();
  const detail = await getLoanDetail(loanId);
  if (!detail) notFound();
  const { loan, events } = detail;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">Préstamo #{loan.id}</p>
          <h1 className="text-2xl font-bold md:text-3xl">{loan.summary}</h1>
          <div className="mt-2">
            <LoanStatusBadge status={loan.status} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Datos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Custodio</div>
              <Person person={loan.borrower} />
            </div>
            <div>
              <div className="text-muted-foreground text-xs">
                Guardián prestador
              </div>
              <Person person={loan.lentBy} />
            </div>
            {loan.competition ? (
              <div>
                <div className="text-muted-foreground text-xs">Competencia</div>
                <Link
                  href={`/panel/competencias/${loan.competition.id}` as Route}
                  className="hover:underline"
                >
                  {loan.competition.name ?? loan.competition.city}
                </Link>
                <a
                  href={`/panel/competencias/${loan.competition.id}/equipo/ficha`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary mt-1 flex items-center gap-1 text-xs hover:underline"
                >
                  <FileDown className="size-3.5" />
                  Descargar ficha de equipo (PDF)
                </a>
              </div>
            ) : null}
            <div>
              <div className="text-muted-foreground text-xs">Razón</div>
              <div>{loan.reason}</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="text-muted-foreground text-xs">Préstamo</div>
                <div>{formatEquipmentDate(loan.loanedAt)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Tentativa</div>
                <div>{formatEquipmentDate(loan.dueAt)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Devolución</div>
                <div>{formatEquipmentDate(loan.returnedAt)}</div>
              </div>
            </div>
            {loan.notes ? (
              <div>
                <div className="text-muted-foreground text-xs">Notas</div>
                <div className="whitespace-pre-line">{loan.notes}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Equipo prestado</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipo</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Devueltos</TableHead>
                    <TableHead>Regresó</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loan.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>{line.typeName}</TableCell>
                      <TableCell className="font-mono">
                        {line.sku ? (
                          <Link
                            href={
                              `/panel/equipo/${encodeURIComponent(line.sku)}` as Route
                            }
                            className="hover:underline"
                          >
                            {line.sku}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {line.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {line.returnedQuantity}
                      </TableCell>
                      <TableCell>
                        {line.returnStatus ? (
                          <EquipmentStatusBadge status={line.returnStatus} />
                        ) : line.returnedAt ? (
                          formatEquipmentDate(line.returnedAt)
                        ) : (
                          <span className="text-muted-foreground">
                            Pendiente
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {loan.status !== "returned" ? (
            <Card>
              <CardHeader>
                <CardTitle>Registrar devolución</CardTitle>
              </CardHeader>
              <CardContent>
                <ReturnForm
                  key={loan.lines
                    .map((line) => `${line.id}:${line.returnedQuantity}`)
                    .join(",")}
                  loanId={loan.id}
                  lines={loan.lines}
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Historial</CardTitle>
            </CardHeader>
            <CardContent>
              <EventTimeline events={events} showSku />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function Page(props: PageProps) {
  return (
    <>
      <Suspense fallback={null}>
        <SearchParamToast
          param="guardado"
          messages={{ prestamo: "Préstamo registrado" }}
        />
      </Suspense>
      <Suspense fallback={<Loading />}>
        <PageContent params={props.params} />
      </Suspense>
    </>
  );
}
