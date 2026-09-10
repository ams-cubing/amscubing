import type { ReactNode } from "react";

export function AmsStatusPage({
  code,
  title,
  description,
  children,
}: {
  code: "404" | "401";
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <main className="flex min-h-[60vh] flex-1 flex-col items-center justify-center bg-ams-soft px-4 py-16">
      <div className="max-w-lg rounded-3xl bg-white p-8 text-center shadow-[0_14px_34px_rgba(1,11,25,0.08)] md:p-10">
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-ams-red">
          {code}
        </p>
        <h1 className="ams-display mt-3 text-4xl leading-none text-ams-navy">
          {title}
        </h1>
        <p className="mt-4 text-base leading-7 text-black/65">{description}</p>
        {children ? (
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {children}
          </div>
        ) : null}
      </div>
    </main>
  );
}
