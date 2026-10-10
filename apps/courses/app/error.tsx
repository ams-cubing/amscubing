"use client";

import Link from "next/link";
import { useEffect } from "react";

import { AmsStatusPage } from "@workspace/ui/components/ams-status-page";
import { buttonVariants } from "@workspace/ui/components/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("courses.error_boundary", error.digest ?? error.message);
  }, [error]);

  return (
    <AmsStatusPage
      code="500"
      title="Algo salió mal"
      description="Ocurrió un error inesperado al cargar esta página."
    >
      <button
        type="button"
        onClick={reset}
        className={buttonVariants({ variant: "destructive", size: "lg" })}
      >
        Intentar de nuevo
      </button>
      <Link
        href="/"
        className={buttonVariants({ variant: "brand", size: "lg" })}
      >
        Volver a cursos
      </Link>
    </AmsStatusPage>
  );
}
