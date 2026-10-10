import { ArrowLeft } from "lucide-react";

export function AmsBackToProfile({
  webUrl,
  section,
}: {
  webUrl: string;
  /** Current admin area, shown as the breadcrumb tail. */
  section: string;
}) {
  return (
    <nav
      aria-label="Ruta de navegación"
      className="flex flex-wrap items-center gap-2 text-sm font-semibold text-black/60"
    >
      <a
        href={`${webUrl.replace(/\/$/, "")}/cuenta`}
        className="inline-flex items-center gap-1.5 text-ams-red hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Volver a mi perfil
      </a>
      <span aria-hidden>/</span>
      <span aria-current="page">{section}</span>
    </nav>
  );
}
