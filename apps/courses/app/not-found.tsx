import Link from "next/link";
export default function NotFound() {
  return (
    <section className="shell section">
      <div className="panel">
        <h1>No encontramos este contenido</h1>
        <p>Puede que el curso todavía no esté publicado.</p>
        <Link className="btn" href="/">
          Explorar cursos
        </Link>
      </div>
    </section>
  );
}
