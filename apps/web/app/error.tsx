"use client";

import { buttonVariants } from "@workspace/ui/components/button";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-linear-to-b from-background to-muted/20">
      <div className="text-center space-y-6 md:space-y-8 max-w-lg bg-card border rounded-lg shadow-lg p-6 md:p-10">
        <div className="flex justify-center">
          <div className="rounded-full bg-orange-500/10 p-4 md:p-5">
            <AlertTriangle className="h-12 w-12 md:h-16 md:w-16 text-orange-500" />
          </div>
        </div>

        <div className="space-y-2 md:space-y-3">
          <h1 className="text-5xl md:text-6xl font-bold text-primary">500</h1>
          <h2 className="text-xl md:text-2xl font-semibold">Algo salió mal</h2>
        </div>

        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
          Lo sentimos, ha ocurrido un error inesperado. Por favor, intenta de
          nuevo.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center pt-2 md:pt-4">
          <button
            onClick={reset}
            className={buttonVariants({ variant: "default", size: "lg" })}
          >
            Intentar de nuevo
          </button>
          <Link
            href="/"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Ir al Inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
