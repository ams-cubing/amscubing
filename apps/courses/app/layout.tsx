import Link from "next/link";
import { Saira, Unbounded } from "next/font/google";
import { canAccessBoardsApp } from "@workspace/auth/boards-access";
import {
  getBoardsUrl,
  getCalendarUrl,
  getCoursesUrl,
  getWebUrl,
} from "@workspace/auth/urls";
import { CoursesAmsNav } from "@/components/ams-site-nav";
import { HeaderNotifications } from "@/components/header-notifications";
import { getViewer, signInUrl } from "@/lib/auth";
import "./globals.css";

const heading = Unbounded({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "700", "900"],
});
const copy = Saira({
  subsets: ["latin"],
  variable: "--font-copy",
  weight: ["400", "500", "600", "700"],
});

export const dynamic = "force-dynamic";
export const metadata = {
  title: { default: "Cursos AMS", template: "%s | Cursos AMS" },
  description:
    "Aprende, participa y fortalece la comunidad de speedcubing en México.",
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();
  return (
    <html lang="es">
      <body className={`${heading.variable} ${copy.variable}`}>
        <CoursesAmsNav
          user={
            viewer
              ? { name: viewer.name, image: viewer.image, email: viewer.email }
              : null
          }
          showBoardsLink={await canAccessBoardsApp(viewer)}
          actions={viewer ? <HeaderNotifications /> : null}
          urls={{
            webUrl: getWebUrl(),
            calendarUrl: getCalendarUrl(),
            boardsUrl: getBoardsUrl(),
            coursesUrl: getCoursesUrl(),
            signInHref: signInUrl(),
          }}
        />
        <div className="course-nav">
          <div className="shell">
            <Link href="/" className="course-brand">
              Cursos AMS
            </Link>
            <nav aria-label="Navegación de cursos">
              <Link href="/">Explorar</Link>
              {viewer && <Link href="/mis-cursos">Mi aprendizaje</Link>}
              {viewer?.canManage && <Link href="/admin">Administrar</Link>}
            </nav>
          </div>
        </div>
        <main>{children}</main>
        <footer className="footer shell">
          <div>
            <strong>Aprender también es hacer comunidad.</strong>
            <p>Asociación Mexicana de Speedcubing</p>
          </div>
          <nav className="footer-links" aria-label="Navegación de AMS">
            <a href={getWebUrl()}>Home</a>
            <a href={`${getWebUrl()}/nosotros`}>Nosotros</a>
            <a href={`${getWebUrl()}/competencias`}>Torneos</a>
            <a href={`${getWebUrl()}/blog`}>Blog</a>
            <Link href="/">Cursos</Link>
          </nav>
        </footer>
      </body>
    </html>
  );
}
