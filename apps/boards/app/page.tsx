import Link from "next/link";

import type { User } from "@workspace/db/schema";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";

import { listAccessibleBoards } from "@/lib/boards";
import { requireSession } from "@/lib/session";

export default async function BoardsHomePage() {
  const session = await requireSession();
  const user = session.user as unknown as User;
  const boards = await listAccessibleBoards(user);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Mis tableros</h1>
        <p className="mt-1 text-muted-foreground">
          Tableros de organización asignados a tus competencias AMS.
        </p>
      </div>

      {boards.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-muted-foreground">
            Aún no tienes tableros. Un delegado puede asignarlos desde el panel
            del calendario.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {boards.map((board) => (
            <li key={board.id}>
              <Button
                asChild
                variant="outline"
                className="h-auto w-full justify-start px-4 py-4"
              >
                <Link href={`/boards/${board.id}`}>
                  <div className="flex w-full flex-col items-start gap-1 text-left">
                    <span className="font-medium">{board.name}</span>
                    {board.competition && (
                      <span className="text-xs font-normal text-muted-foreground">
                        {board.competition.city}
                        {board.competition.startDate
                          ? ` · ${board.competition.startDate}`
                          : ""}
                      </span>
                    )}
                    {board.competition?.statusPublic && (
                      <Badge variant="secondary" className="mt-1">
                        {board.competition.statusPublic}
                      </Badge>
                    )}
                  </div>
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
