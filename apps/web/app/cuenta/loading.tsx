import { PageSkeleton } from "@/components/page-skeleton";

import { AccountBodyFallback } from "./_components/account-body-fallback";

export default function Loading() {
  return (
    <PageSkeleton>
      <div className="max-w-280 mx-auto">
        <AccountBodyFallback />
      </div>
    </PageSkeleton>
  );
}
