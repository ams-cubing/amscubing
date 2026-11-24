import {
  wcaEventIconClass,
  type WcaEvent,
} from "@workspace/db/competition-format-rules";

export function WcaEventIcon({
  eventId,
  className,
}: {
  eventId: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`${wcaEventIconClass(eventId)} ${className ?? "text-base leading-none"}`}
    />
  );
}

export function WcaEventLabel({
  event,
}: {
  event: Pick<WcaEvent, "id" | "name">;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <WcaEventIcon eventId={event.id} />
      <span className="truncate font-medium">{event.name}</span>
    </span>
  );
}
