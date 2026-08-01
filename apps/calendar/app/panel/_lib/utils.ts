import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  CircleIcon,
  XCircleIcon,
  type LucideIcon,
} from "lucide-react";
import { type Competition } from "@workspace/db/schema";

export function getStatusPublicIcon(statusPublic: Competition["statusPublic"]) {
  const statusPublicIcons: Record<Competition["statusPublic"], LucideIcon> = {
    open: CircleIcon,
    reserved: CircleIcon,
    confirmed: CheckCircleIcon,
    announced: CheckCircleIcon,
    suspended: XCircleIcon,
    unavailable: XCircleIcon,
  };

  return statusPublicIcons[statusPublic];
}

export function getStatusInternalIcon(
  statusInternal: Competition["statusInternal"],
) {
  const statusInternalIcons: Record<Competition["statusInternal"], LucideIcon> =
    {
      asked_for_help: ArrowRightIcon,
      looking_for_venue: ArrowDownIcon,
      venue_found: ArrowUpIcon,
      wca_approved: CheckCircleIcon,
      registration_open: CheckCircleIcon,
      celebrated: CheckCircleIcon,
      cancelled: XCircleIcon,
    };

  return statusInternalIcons[statusInternal];
}
