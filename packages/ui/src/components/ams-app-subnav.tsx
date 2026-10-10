import Link from "next/link";

/** Secondary bar under the AMS header with the app name and its own sections. */
export function AmsAppSubnav({
  title,
  href = "/",
  label,
  links,
}: {
  title: string;
  href?: string;
  label: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div className="ams-heading border-b border-ams-navy/10 bg-white text-xs text-ams-navy">
      <div className="ams-container flex max-w-295 items-center justify-between gap-5 py-4.5">
        <Link href={href} className="font-bold text-ams-red">
          {title}
        </Link>
        <nav aria-label={label} className="flex flex-wrap gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-ams-red"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
