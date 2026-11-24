import { ExternalLink } from "lucide-react";

import { Button } from "@workspace/ui/components/button";

export type CardFallbackLink = {
  name: string;
  url: string;
};

/** Offline Excel / Drive / doc links kept when in-app card tools fail. */
export function CardFallbackLinks({
  links,
  note = "Si la sección del tablero falla, usa estos respaldos:",
}: {
  links: readonly CardFallbackLink[];
  note?: string;
}) {
  if (links.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">{note}</p>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Button key={link.url} asChild variant="outline" size="sm">
            <a href={link.url} target="_blank" rel="noreferrer">
              {link.name}
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        ))}
      </div>
    </div>
  );
}
