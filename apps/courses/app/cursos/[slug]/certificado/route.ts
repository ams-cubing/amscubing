import { db } from "@workspace/db";
import { courses } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getLearner } from "@/lib/auth";
import { issueCertificate } from "@/lib/certificates";
import { createCertificatePdf } from "@/lib/certificate-pdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const viewer = await getLearner();
  if (!viewer)
    return new Response("Inicia sesión para descargar tu certificado", {
      status: 401,
    });
  const { slug } = await params;
  const [course] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.slug, slug));
  if (!course) return new Response("Curso no encontrado", { status: 404 });
  const certificate = await issueCertificate(course.id, viewer.id);
  if (!certificate)
    return new Response("Completa el curso para obtener tu certificado", {
      status: 403,
    });
  const bytes = await createCertificatePdf(certificate);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificado-${certificate.folio}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
