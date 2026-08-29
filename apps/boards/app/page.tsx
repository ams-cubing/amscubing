import {
  listAccessibleBoards,
  listArchivedBoards,
  listTemplates,
} from "@/lib/boards";
import { requireSessionOrUnauthorized } from "@/lib/session";

import { BoardList } from "./_components/board-list";
import { CreateBoardDialog } from "./_components/create-board-dialog";

export default async function BoardsHomePage() {
  const session = await requireSessionOrUnauthorized();
  const user = session.user;
  const isDelegate = user.role === "delegate";

  const [boards, templates, archived] = await Promise.all([
    listAccessibleBoards(user),
    isDelegate ? listTemplates(user) : Promise.resolve([]),
    listArchivedBoards(user),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 space-y-10 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Mis tableros
          </h1>
          <p className="mt-1 text-muted-foreground">
            {isDelegate
              ? "Tableros de organización AMS, plantillas y tableros en blanco."
              : "Tableros de organización asignados a tus competencias AMS."}
          </p>
        </div>
        {isDelegate && (
          <div className="flex flex-wrap gap-2">
            <CreateBoardDialog mode="blank" />
            <CreateBoardDialog mode="template" />
          </div>
        )}
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-medium tracking-tight">Activos</h2>
        <BoardList
          boards={boards}
          emptyMessage={
            isDelegate
              ? "Aún no hay tableros activos. Crea uno en blanco o asígnalo desde el panel del calendario."
              : "Aún no tienes tableros. Un delegado puede asignarlos desde el panel del calendario o invitarte."
          }
        />
      </section>

      {isDelegate && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium tracking-tight">Plantillas</h2>
          <BoardList
            boards={templates}
            emptyMessage="No hay plantillas. Crea una nueva para empezar."
            showBlankBadge={false}
          />
        </section>
      )}

      {archived.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium tracking-tight">Archivados</h2>
          <BoardList
            boards={archived}
            emptyMessage="No hay tableros archivados."
          />
        </section>
      )}
    </div>
  );
}
