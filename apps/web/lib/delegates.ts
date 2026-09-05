import "server-only";

import { db } from "@workspace/db";
import type { PublicDelegate } from "./delegate-types";

export type { PublicDelegate };

const wcaAvatarById: Record<string, string | null> = {
  "2014MART08":
    "https://avatars.worldcubeassociation.org/uploads/user/avatar/2014MART08/1496807672_thumb.JPG",
  "2014DZUL02":
    "https://avatars.worldcubeassociation.org/uploads/user/avatar/2014DZUL02/1668463228_thumb.jpg",
  "2016ROBL05":
    "https://avatars.worldcubeassociation.org/dtgy8gcrrwyta3nffjs5mwswynzo",
  "2015CARD01":
    "https://avatars.worldcubeassociation.org/uploads/user/avatar/2015CARD01/1685712606_thumb.jpg",
  "2016TORO03":
    "https://avatars.worldcubeassociation.org/mlypawxraj938ea8ktwxscvli3ue",
  "2016RIVE14":
    "https://avatars.worldcubeassociation.org/uploads/user/avatar/2016RIVE14/1551846588_thumb.JPG",
  "2018GONZ21":
    "https://avatars.worldcubeassociation.org/wet43gev5c25h5bel5jmg79fklis",
};

export const fallbackDelegates: PublicDelegate[] = [
  {
    name: "Areli Rubí Gordillo Martínez",
    wcaId: "2014MART08",
    title: "Delegado Regional MCA",
    location: "México y Centro América",
  },
  {
    name: "Carlos Ricardo Chin Dzul",
    wcaId: "2014DZUL02",
    title: "Delegado Junior",
    location: "Mérida - Suroeste",
  },
  {
    name: "Christofer Alejandro Aguirre Robledo",
    wcaId: "2016ROBL05",
    title: "Delegado y Miembro del WCAT",
    location: "Baja California - Noroeste",
  },
  {
    name: "Jaime Tadeo Pérez Cardona",
    wcaId: "2015CARD01",
    title: "Delegado Junior",
    location: "Ciudad de México - Centro",
  },
  {
    name: "Leonardo Sánchez Del Toro",
    wcaId: "2016TORO03",
    title: "Delegado en Entrenamiento",
    location: "Nayarit - Occidente",
  },
  {
    name: "Rocío Rodríguez Rivera",
    wcaId: "2016RIVE14",
    title: "Delegado Junior",
    location: "Ciudad de México - Centro",
  },
  {
    name: "Saúl Emmanuel Ramírez González",
    wcaId: "2018GONZ21",
    title: "Delegado Junior",
    location: "Jalisco - Occidente",
  },
].map(withWcaMetadata);

function withWcaMetadata(
  delegate: Omit<PublicDelegate, "avatarUrl" | "wcaProfileUrl"> & {
    avatarUrl?: string | null;
  },
): PublicDelegate {
  return {
    ...delegate,
    avatarUrl: delegate.avatarUrl ?? wcaAvatarById[delegate.wcaId] ?? null,
    wcaProfileUrl: `https://www.worldcubeassociation.org/persons/${delegate.wcaId}`,
  };
}

export async function getPublicDelegates(): Promise<PublicDelegate[]> {
  try {
    const rows = await db.query.user.findMany({
      orderBy: (t, { asc }) => [asc(t.name)],
      where: (t, { eq }) => eq(t.role, "delegate"),
      columns: {
        name: true,
        image: true,
        wcaId: true,
        delegateTitle: true,
        delegateLocation: true,
      },
      with: {
        region: {
          columns: {
            displayName: true,
          },
        },
      },
    });

    if (rows.length === 0) {
      return fallbackDelegates;
    }

    return rows.map((row) =>
      withWcaMetadata({
        name: row.name,
        wcaId: row.wcaId,
        title: row.delegateTitle ?? "Delegado",
        location: row.delegateLocation ?? row.region?.displayName ?? "México",
        avatarUrl: row.image,
      }),
    );
  } catch {
    return fallbackDelegates;
  }
}
