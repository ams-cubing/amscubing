import { getWebUrl } from "@workspace/auth/urls";
import { AmsBackToProfile } from "@workspace/ui/components/ams-back-to-profile";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="shell pt-6">
        <AmsBackToProfile webUrl={getWebUrl()} section="Administrar Blog" />
      </div>
      {children}
    </>
  );
}
