import Link from "next/link";

import { AmsStatusPage } from "@workspace/ui/components/ams-status-page";
import { buttonVariants } from "@workspace/ui/components/button";

export default function NotFound() {
  return (
    <AmsStatusPage
      code="404"
      title="No encontramos este contenido"
      description="Puede que el curso todavía no esté publicado."
    >
      <Link
        href="/"
        className={buttonVariants({ variant: "destructive", size: "lg" })}
      >
        Explorar cursos
      </Link>
    </AmsStatusPage>
  );
}
