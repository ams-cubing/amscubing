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
    console.error("calendar.error_boundary", error.digest ?? error.message);
  }, [error]);

  return (
    <AmsStatusPage
      code="500"
      title="Algo salió mal"
      description="Lo sentimos, ha ocurrido un error inesperado. Por favor, intenta de nuevo."
    >
      <button
        type="button"
        onClick={reset}
        className={buttonVariants({ variant: "default", size: "lg" })}
      >
        Intentar de nuevo
      </button>
      <Link
        href="/"
        className={buttonVariants({ variant: "outline", size: "lg" })}
      >
        Ir al inicio
      </Link>
    </AmsStatusPage>
  );
}
