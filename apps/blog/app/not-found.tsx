import Link from "next/link";

import { AmsStatusPage } from "@workspace/ui/components/ams-status-page";
import { buttonVariants } from "@workspace/ui/components/button";

export default function NotFound() {
  return (
    <AmsStatusPage
      code="404"
      title="No encontramos esta entrada"
      description="Puede que se haya movido, archivado o que la dirección esté mal."
    >
      <Link
        href="/"
        className={buttonVariants({ variant: "destructive", size: "lg" })}
      >
        Explorar el blog
      </Link>
    </AmsStatusPage>
  );
}
