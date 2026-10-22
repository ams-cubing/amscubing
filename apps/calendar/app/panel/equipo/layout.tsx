import { EquipmentNav } from "./_components/equipment-nav";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <EquipmentNav />
        {children}
      </div>
    </div>
  );
}
