import Link from "next/link";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";

export function Header() {
  return (
    <header className="bg-card border-b">
      <div className="mx-auto flex items-center gap-3 md:gap-4 px-4 md:px-5 py-4">
        <SidebarTrigger />
        <Link
          href="/"
          className="text-base md:text-lg font-semibold hover:text-primary transition-colors"
        >
          Calendario Público de Competencias en México
        </Link>
      </div>
    </header>
  );
}
