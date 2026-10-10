import type { AccountAction } from "../_lib/actions-config";

export function ActionCard({
  action,
  compact = false,
}: {
  action: AccountAction;
  compact?: boolean;
}) {
  const Icon = action.icon;
  const external = action.href.startsWith("http");

  return (
    <a
      href={action.href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="group block rounded-5.5 bg-ams-soft p-7 transition-transform hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(1,11,25,0.12)]"
    >
      <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-ams-red text-white transition-colors group-hover:bg-ams-green">
        <Icon className="size-5" />
      </div>
      <h3
        className={`ams-display leading-none text-ams-navy ${
          compact ? "text-2xl" : "text-3xl"
        }`}
      >
        {action.title}
      </h3>
      <p className="ams-copy mt-4 text-sm leading-6 text-black/65">
        {action.description}
      </p>
    </a>
  );
}
