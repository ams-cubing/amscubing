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
import { EQUIPMENT_STATUS_LABELS } from "@workspace/db/equipment-labels";

import { EquipmentStatusBadge, ReservedBadge } from "../_components/badges";
import { EventTimeline } from "../_components/event-timeline";
import { ItemEditForm, ItemTransferDialog } from "../_components/item-forms";
import { Person } from "../_components/person";
import { formatEquipmentDate } from "@/lib/equipment-format";
import { getGuardians, getItemDetail } from "../_lib/queries";
import Loading from "../loading";

type PageProps = { params: Promise<{ sku: string }> };

async function PageContent({ params }: PageProps) {
  const { sku } = await params;
  const [detail, guardians] = await Promise.all([
    getItemDetail(decodeURIComponent(sku)),
    getGuardians(),
  ]);
  if (!detail) notFound();
  const { item, loans, events } = detail;
  const onLoan = item.onLoanId != null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">{item.typeName}</p>
          <h1 className="font-mono text-3xl font-bold">{item.sku}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <EquipmentStatusBadge status={item.status} />
            {onLoan ? (
              <Link
                href={`/panel/equipo/prestamos/${item.onLoanId}` as Route}
                className="text-sm text-amber-700 hover:underline"
              >
                Prestado (préstamo #{item.onLoanId})
              </Link>
            ) : null}
            {item.reservedFor ? (
              <Link
                prefetch={false}
                href={
                  `/panel/competencias/${item.reservedFor.competitionId}` as Route
                }
              >
                <ReservedBadge competition={item.reservedFor.name} />
              </Link>
            ) : null}
          </div>
        </div>
        <ItemTransferDialog
          itemId={item.id}
          sku={item.sku}
          currentGuardianId={item.guardian?.id ?? null}
          guardians={guardians}
          disabled={
            onLoan || item.reservedFor != null || item.status === "retired"
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Datos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="text-muted-foreground text-xs">Guardián</div>
                {item.guardian ? <Person person={item.guardian} /> : "—"}
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Procedencia</div>
                <div>{item.source ?? "—"}</div>
                {detail.acquisitionDescription ? (
                  <div className="text-muted-foreground text-xs">
                    {detail.acquisitionDescription} ·{" "}
                    {formatEquipmentDate(detail.acquisitionDate)}
                  </div>
                ) : null}
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Registrado</div>
                <div>{formatEquipmentDate(detail.createdAt)}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estado y notas</CardTitle>
            </CardHeader>
            <CardContent>
              <ItemEditForm
                itemId={item.id}
                status={item.status}
                notes={item.notes}
                onLoan={onLoan}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Préstamos</CardTitle>
            </CardHeader>
            <CardContent>
              {loans.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nunca se ha prestado.
                </p>
              ) : (
                <ul className="divide-y text-sm">
                  {loans.map((loan) => (
                    <li key={loan.loanId} className="py-2">
                      <Link
                        href={`/panel/equipo/prestamos/${loan.loanId}` as Route}
                        className="font-medium hover:underline"
                      >
                        #{loan.loanId} · {loan.borrowerName}
                      </Link>
                      <div className="text-muted-foreground">
                        {formatEquipmentDate(loan.loanedAt)} →{" "}
                        {loan.lineReturnedAt
                          ? `${formatEquipmentDate(loan.lineReturnedAt)} (${loan.returnStatus ? EQUIPMENT_STATUS_LABELS[loan.returnStatus] : "devuelto"})`
                          : "sin devolver"}
                        {" · "}
                        {loan.reason}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historial</CardTitle>
            </CardHeader>
            <CardContent>
              <EventTimeline events={events} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function Page(props: PageProps) {
  return (
    <Suspense fallback={<Loading />}>
      <PageContent params={props.params} />
    </Suspense>
  );
}
