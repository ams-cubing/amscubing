import Link from "next/link";
import { Saira, Unbounded } from "next/font/google";
import { AmsSiteNav } from "@workspace/ui/components/ams-site-nav";
import { getWebUrl, getBlogUrl } from "@workspace/auth/urls";
import { getViewer, signInUrl } from "@/lib/auth";
import "./globals.css";
const heading = Unbounded({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "700", "900"],
});
const body = Saira({
  subsets: ["latin"],
  variable: "--font-copy",
  weight: ["400", "500", "600", "700"],
});
export const dynamic = "force-dynamic";
export const metadata = {
  metadataBase: new URL(getBlogUrl()),
  title: { default: "Blog AMS", template: "%s | Blog AMS" },
  description: "Historias, guías y comunidad de speedcubing en México.",
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();
  return (
    <html lang="es">
      <body className={`${heading.variable} ${body.variable}`}>
        <AmsSiteNav
          active="Blog"
          webUrl={getWebUrl()}
          account={
            <a
              className="account"
              href={viewer ? `${getWebUrl()}/cuenta` : signInUrl()}
            >
              {viewer ? viewer.name.split(" ")[0] : "Iniciar sesión"} ↗
            </a>
          }
        />
        <div className="subnav shell">
          <Link href="/" className="wordmark">
            Blog AMS
          </Link>
          <nav aria-label="Blog">
            <Link href="/">Explorar</Link>
            {viewer?.canManage && <Link href="/admin">Administrar</Link>}
          </nav>
        </div>
        <main>{children}</main>
        <footer className="shell footer">
          <div>
            <strong>Historias que hacen comunidad.</strong>
            <p>Asociación Mexicana de Speedcubing</p>
          </div>
          <nav aria-label="AMS">
            <a href={getWebUrl()}>Home</a>
            <a href={`${getWebUrl()}/nosotros`}>Nosotros</a>
            <a href={`${getWebUrl()}/competencias`}>Torneos</a>
            <Link href="/">Blog</Link>
            <a href={`${getWebUrl()}/cursos`}>Cursos</a>
          </nav>
        </footer>
      </body>
    </html>
  );
}
