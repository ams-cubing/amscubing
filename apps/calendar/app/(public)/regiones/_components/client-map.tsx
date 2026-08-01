"use client";

import dynamic from "next/dynamic";

const RegionMap = dynamic(
  () =>
    import("./region-map").then((mod) => ({
      default: mod.RegionMap,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center items-center h-100 md:h-125 bg-muted/20 rounded-lg">
        <div className="text-muted-foreground">Cargando mapa...</div>
      </div>
    ),
  },
);

export function ClientMap({
  regionsWithDelegates,
}: {
  regionsWithDelegates: {
    delegates: {
      wcaId: string;
      role: "delegate" | "user";
      regionId: string | null;
      lastLogin: Date | null;
      id: string;
      name: string;
      email: string;
      emailVerified: boolean;
      image: string | null;
      createdAt: Date;
      updatedAt: Date;
      region: {
        id: string;
        displayName: string;
        mapColor: string;
      } | null;
    }[];
    id: string;
    displayName: string;
    mapColor: string;
    states: {
      regionId: string;
      id: string;
      name: string;
    }[];
  }[];
}) {
  return (
    <section className="bg-card border rounded-lg p-4 md:p-6 shadow-sm">
      <h2 className="text-lg md:text-xl font-semibold mb-4">
        Mapa Interactivo de Regiones
      </h2>
      <RegionMap regions={regionsWithDelegates} />
      <p className="text-sm text-muted-foreground mt-3">
        Haz clic en un estado para ver información del delegado de la región
      </p>
    </section>
  );
}
