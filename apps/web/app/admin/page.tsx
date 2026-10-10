import { redirect } from "next/navigation";

import { getAdminAccess } from "./_lib/admin-access";

export default async function AdminIndexPage() {
  const access = await getAdminAccess();
  redirect(access?.isDelegate ? "/admin/delegados" : "/admin/permisos");
}
