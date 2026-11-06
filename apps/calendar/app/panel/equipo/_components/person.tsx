import Image from "next/image";
import type { EquipmentPerson } from "@workspace/db/equipment";

export function Person({
  person,
  size = 24,
}: {
  person: EquipmentPerson;
  size?: number;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      {person.image ? (
        <Image
          src={person.image}
          alt=""
          width={size}
          height={size}
          className="rounded-full object-cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <span
          className="bg-muted text-muted-foreground inline-flex items-center justify-center rounded-full text-xs font-semibold"
          style={{ width: size, height: size }}
        >
          {person.name.charAt(0)}
        </span>
      )}
      <span className="flex flex-col leading-tight">
        <span className="font-medium">{person.name}</span>
        {person.wcaId ? (
          <span className="text-muted-foreground text-xs">{person.wcaId}</span>
        ) : null}
      </span>
    </span>
  );
}
