import Link from "next/link";

export default function NotFound() {
  return (
    <section className="shell section">
      <div className="panel">
        <p className="eyebrow">404</p>
        <h1>No encontramos esta entrada</h1>
        <p>Puede que se haya movido, archivado o que la dirección esté mal.</p>
        <div className="section-tools">
          <Link className="button" href="/">
            Explorar el blog
          </Link>
        </div>
      </div>
    </section>
  );
}
