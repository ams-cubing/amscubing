import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";
import {
  EQUIPMENT_STATUS_LABELS,
  LOAN_STATUS_LABELS,
  type EquipmentStatus,
  type LoanStatus,
} from "@workspace/db/equipment-labels";

import {
  LOAN_BADGE_CLASSES,
  STATUS_BADGE_CLASSES,
} from "@/lib/equipment-format";

export function EquipmentStatusBadge({ status }: { status: EquipmentStatus }) {
  return (
    <Badge variant="outline" className={cn(STATUS_BADGE_CLASSES[status])}>
      {EQUIPMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

export function LoanStatusBadge({ status }: { status: LoanStatus }) {
  return (
    <Badge variant="outline" className={cn(LOAN_BADGE_CLASSES[status])}>
      {LOAN_STATUS_LABELS[status]}
    </Badge>
  );
}
