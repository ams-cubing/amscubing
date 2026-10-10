"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Shows a success toast for `?param=value` (e.g. after a redirecting action) and
 * removes the param from the URL. Must be rendered inside `<Suspense>`.
 */
export function SearchParamToast({
  param,
  messages,
}: {
  param: string;
  messages: Record<string, string>;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const value = searchParams.get(param);

  useEffect(() => {
    if (!value) return;
    const message = messages[value];
    if (message) toast.success(message, { id: `${param}:${value}` });
    const next = new URLSearchParams(searchParams);
    next.delete(param);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [value, param, messages, pathname, router, searchParams]);

  return null;
}
