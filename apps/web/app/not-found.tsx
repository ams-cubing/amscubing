import { buttonVariants } from "@workspace/ui/components/button";
import { FileQuestion } from "lucide-react";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-linear-to-b from-background to-muted/20">
      <div className="text-center space-y-6 md:space-y-8 max-w-lg bg-card border rounded-lg shadow-lg p-6 md:p-10">
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-4 md:p-5">
            <FileQuestion className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2 md:space-y-3">
          <h1 className="text-5xl md:text-6xl font-bold text-primary">404</h1>
          <h2 className="text-xl md:text-2xl font-semibold">
            Página no encontrada
          </h2>
        </div>

        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
          Lo sentimos, la página que buscas no existe o ha sido movida.
        </p>

        <div className="flex gap-3 md:gap-4 justify-center pt-2 md:pt-4">
          <Link
            href="/"
            className={buttonVariants({ variant: "default", size: "lg" })}
          >
            Ir al Inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
