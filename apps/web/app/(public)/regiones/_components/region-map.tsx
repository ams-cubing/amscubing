"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { GeoJsonObject, Feature } from "geojson";
import type { Layer } from "leaflet";
import Image from "next/image";

type State = {
  id: string;
  name: string;
  regionId: string;
};

type Region = {
  id: string;
  displayName: string;
  mapColor: string;
  states: State[];
};

type Delegate = {
  id: string;
  name: string;
  email: string;
  wcaId: string | null;
  image: string | null;
};

type RegionWithDelegates = Region & {
  delegates?: Delegate[];
};

type RegionMapProps = {
  regions: RegionWithDelegates[];
};

export function RegionMap({ regions }: RegionMapProps) {
  const [geoData, setGeoData] = useState<GeoJsonObject | null>(null);
  const [loading, setLoading] = useState(true);

  // Build a map of state ID -> region data for quick lookups
  const stateToRegion = new Map<string, RegionWithDelegates>();
  regions.forEach((region) => {
    region.states.forEach((state) => {
      stateToRegion.set(state.id, region);
    });
  });

  useEffect(() => {
    fetch("https://calendario.amscubing.org/states.geojson")
      .then((response) => response.json())
      .then((data) => {
        setGeoData(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading GeoJSON:", error);
        setLoading(false);
      });
  }, []);

  // Style function for each state polygon
  const style = (feature?: Feature) => {
    if (!feature?.properties?.id) return { fillColor: "#ccc", weight: 1 };

    // Extract state ID (remove "MX-" prefix)
    const stateId = feature.properties.id.replace("MX-", "");
    const region = stateToRegion.get(stateId);

    return {
      fillColor: region?.mapColor || "#cccccc",
      fillOpacity: 0.7,
      color: "#ffffff",
      weight: 1.5,
    };
  };

  // Handle mouse over state
  const onEachFeature = (feature: Feature, layer: Layer) => {
    if (!feature.properties) return;

    const stateName = feature.properties.name;
    const stateId = feature.properties.id.replace("MX-", "");
    const region = stateToRegion.get(stateId);

    // Tooltip on hover
    layer.bindTooltip(
      `<div class="text-sm">
        <strong>${stateName}</strong><br/>
        ${region ? `Región: ${region.displayName}` : "Sin región asignada"}
      </div>`,
      { sticky: true },
    );

    // Popup on click with delegate info
    if (region) {
      const delegates = region.delegates || [];
      const delegateList =
        delegates.length > 0
          ? delegates
              .map(
                (d) =>
                  `<li><strong>${d.name}</strong><br/><a href="mailto:${d.email}" class="text-primary">${d.email}</a></li>`,
              )
              .join("")
          : "<li>No hay delegados asignados</li>";

      layer.bindPopup(
        `<div class="p-2">
          <h3 class="font-semibold text-lg mb-1">${stateName}</h3>
          <p class="text-sm text-muted-foreground mb-2">Región: ${region.displayName}</p>
          <p class="text-sm font-medium mb-1">Delegados:</p>
          <ul class="text-sm space-y-1">${delegateList}</ul>
        </div>`,
        { maxWidth: 300 },
      );
    }

    // Highlight on mouse over
    layer.on({
      mouseover: (e) => {
        const target = e.target;
        target.setStyle({
          weight: 3,
          fillOpacity: 0.9,
        });
      },
      mouseout: (e) => {
        const target = e.target;
        target.setStyle({
          weight: 1.5,
          fillOpacity: 0.7,
        });
      },
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-100 md:h-125 bg-muted/20 rounded-lg">
        <div className="text-muted-foreground">Cargando mapa...</div>
      </div>
    );
  }

  if (!geoData) {
    return (
      <div className="h-100 md:h-125 rounded-lg overflow-hidden border shadow-sm">
        <Image
          src="/mapa.png"
          alt="Mapa de regiones"
          className="w-full h-full object-contain"
          width={736}
          height={491}
        />
      </div>
    );
  }

  return (
    <div className="h-100 md:h-125 rounded-lg overflow-hidden border shadow-sm">
      <MapContainer
        center={[23.6345, -102.5528]}
        zoom={5}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GeoJSON data={geoData} style={style} onEachFeature={onEachFeature} />
      </MapContainer>
    </div>
  );
}
