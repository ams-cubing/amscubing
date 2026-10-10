"use client";

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
    console.error("blog.error_boundary", error.digest ?? error.message);
  }, [error]);

  return (
    <section className="shell section">
      <div className="panel">
        <p className="eyebrow">500</p>
        <h1>Algo salió mal</h1>
        <p>Ocurrió un error inesperado al cargar esta página.</p>
        <div className="section-tools">
          <button type="button" className="button" onClick={reset}>
            Intentar de nuevo
          </button>
          <Link className="button secondary" href="/">
            Volver al blog
          </Link>
        </div>
      </div>
    </section>
  );
}
