import { headers } from "next/headers";

function isPreviewDeploy(host: string) {
  if (process.env.VERCEL_ENV === "preview") return true;
  return host.startsWith("beta.") || host.startsWith("beta-");
}

export async function PreviewBanner({
  productionHost,
}: {
  productionHost: string;
}) {
  const host = (await headers()).get("host") ?? "";
  if (!isPreviewDeploy(host)) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-800/25 bg-amber-500 px-3 py-2 text-center text-sm font-medium text-amber-950"
    >
      <span className="font-bold tracking-wide">Vista previa</span>
      <span className="mx-1.5 text-amber-950/70">·</span>
      Entorno de prueba. Los cambios no afectan producción
      <span className="whitespace-nowrap"> ({productionHost})</span>
    </div>
  );
}
