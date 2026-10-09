"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="shell section">
      <div className="panel">
        <h1>No pudimos completar esta acción</h1>
        <p>
          Revisa los campos e inténtalo de nuevo. Si el problema continúa,
          contacta al equipo AMS.
        </p>
        <button className="btn" onClick={reset}>
          Volver a intentar
        </button>
      </div>
    </section>
  );
}
