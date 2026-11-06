import { EquipmentNav } from "./_components/equipment-nav";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <EquipmentNav />
      {children}
    </div>
  );
}
