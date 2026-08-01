"use client";

import * as React from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";

export function DetailsDialog({ details }: { details: unknown }) {
  return (
    <Dialog>
      <DialogTrigger className="hover:underline text-sm cursor-pointer">
        Ver detalles
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detalles</DialogTitle>
        </DialogHeader>
        <div className="max-h-64 overflow-auto">
          <pre className="whitespace-pre-wrap text-xs">
            {JSON.stringify(details || {}, null, 2)}
          </pre>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button>Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
