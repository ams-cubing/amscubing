import { requireDelegateAdminPage } from "@/app/admin/_lib/admin-access";

import { EquipmentNav } from "./_components/equipment-nav";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireDelegateAdminPage();

  return (
    <div className="space-y-6">
      <EquipmentNav />
      {children}
    </div>
  );
}
