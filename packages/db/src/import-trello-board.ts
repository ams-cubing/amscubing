import "./env";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { and, eq } from "drizzle-orm";

import { DELEGATES_BOARD_NAME, isDelegatesBoard } from "./delegates-board";
import { db } from "./index";
import {
  boardLists,
  boardMembers,
  boards,
  cardAttachments,
  cardComments,
  cardLabels,
  cardMembers,
  cards,
  checklistItems,
  checklists,
  labels,
  user,
} from "./schema";
import {
  matchTrelloMembersByName,
  planTrelloImport,
  type TrelloExport,
} from "./trello-import";

const USAGE = `Uso: pnpm --filter @workspace/db db:import-trello <export.json> --actor <WCA ID> [opciones]

Crea un tablero nuevo con las listas, tarjetas, etiquetas, checklists,
responsables, adjuntos y comentarios abiertos de un export JSON de Trello.

  --name <nombre>          Nombre del tablero (por defecto «${DELEGATES_BOARD_NAME}»,
                           el tablero especial de delegados).
  --member <usuario>=<WCA ID>
                           Asocia un usuario de Trello con una cuenta cuando el
                           nombre no basta (se puede repetir).
  --dry-run                Muestra el resultado sin guardar nada.

Los miembros se asocian por nombre con delegados (o con --member). En tableros
que no son el de delegados, los miembros asociados se agregan al tablero.
Los archivos subidos a Trello requieren sesión de Trello: se importan como
enlace a la tarjeta original. Si ya existe un tablero con ese nombre, no hace nada.`;

class DryRun extends Error {}

function parseArgs(argv: string[]) {
  const args = {
    file: "",
    actor: "",
    name: DELEGATES_BOARD_NAME,
    members: new Map<string, string>(),
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--actor") args.actor = argv[++i] ?? "";
    else if (arg === "--name") args.name = (argv[++i] ?? "").trim();
    else if (arg === "--member") {
      const [username, wcaId] = (argv[++i] ?? "").split("=");
      if (!username || !wcaId) {
        console.error("--member espera <usuario de Trello>=<WCA ID>");
        process.exit(1);
      }
      args.members.set(username.toLowerCase(), wcaId.toUpperCase());
    } else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--help" || arg === "-h") {
      console.log(USAGE);
      process.exit(0);
    } else if (!args.file) args.file = arg;
  }
  if (!args.file || !args.actor || !args.name) {
    console.error(USAGE);
    process.exit(1);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const trello = JSON.parse(
    await readFile(resolve(process.cwd(), args.file), "utf8"),
  ) as TrelloExport;

  const [actor] = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(eq(user.wcaId, args.actor.toUpperCase()));
  if (!actor) throw new Error(`No existe un usuario con WCA ID ${args.actor}`);

  const existing = await db.query.boards.findFirst({
    where: and(eq(boards.name, args.name), eq(boards.isTemplate, false)),
    columns: { id: true },
  });
  if (existing) {
    console.log(
      `Ya existe el tablero «${args.name}» (id=${existing.id}); no se importó nada.`,
    );
    return;
  }

  const delegatesBoard = isDelegatesBoard({
    name: args.name,
    isTemplate: false,
    competitionId: null,
  });

  const users = await db
    .select({
      id: user.id,
      name: user.name,
      wcaId: user.wcaId,
      role: user.role,
    })
    .from(user);
  const matched = matchTrelloMembersByName(
    trello.members,
    users.filter((row) => row.role === "delegate"),
  );
  for (const [username, wcaId] of args.members) {
    const member = trello.members.find(
      (m) => m.username.toLowerCase() === username,
    );
    if (!member) throw new Error(`--member: ${username} no está en el export`);
    const found = users.find((row) => row.wcaId === wcaId);
    if (!found) throw new Error(`--member: no hay usuario con WCA ID ${wcaId}`);
    if (delegatesBoard && found.role !== "delegate") {
      throw new Error(
        `--member: ${found.name} no es delegado y este tablero es solo para delegados`,
      );
    }
    matched.set(member.id, found);
  }

  const unmatched = trello.members.filter((member) => !matched.has(member.id));
  const plan = planTrelloImport(trello, matched);
  let boardId = 0;

  try {
    await db.transaction(async (tx) => {
      const [board] = await tx
        .insert(boards)
        .values({ name: args.name, isTemplate: false, competitionId: null })
        .returning({ id: boards.id });
      boardId = board!.id;

      if (!delegatesBoard) {
        const memberIds = [...new Set([...matched.values()].map((u) => u.id))];
        if (memberIds.length) {
          await tx
            .insert(boardMembers)
            .values(memberIds.map((userId) => ({ boardId, userId })));
        }
      }

      const listRows = await tx
        .insert(boardLists)
        .values(
          plan.lists.map((title, position) => ({ boardId, title, position })),
        )
        .returning({ id: boardLists.id });

      const labelRows = plan.labels.length
        ? await tx
            .insert(labels)
            .values(plan.labels.map((label) => ({ boardId, ...label })))
            .returning({ id: labels.id })
        : [];

      const positions = new Map<number, number>();
      for (const card of plan.cards) {
        const position = positions.get(card.listIndex) ?? 0;
        positions.set(card.listIndex, position + 1);

        const [cardRow] = await tx
          .insert(cards)
          .values({
            listId: listRows[card.listIndex]!.id,
            title: card.title,
            description: card.description,
            position,
            dueDate: card.dueDate,
            createdAt: card.createdAt,
          })
          .returning({ id: cards.id });
        const cardId = cardRow!.id;

        if (card.labelIndexes.length) {
          await tx.insert(cardLabels).values(
            card.labelIndexes.map((index) => ({
              cardId,
              labelId: labelRows[index]!.id,
            })),
          );
        }
        if (card.memberUserIds.length) {
          await tx
            .insert(cardMembers)
            .values(card.memberUserIds.map((userId) => ({ cardId, userId })));
        }
        for (const [
          checklistPosition,
          checklist,
        ] of card.checklists.entries()) {
          const [checklistRow] = await tx
            .insert(checklists)
            .values({
              cardId,
              title: checklist.title,
              position: checklistPosition,
            })
            .returning({ id: checklists.id });
          if (checklist.items.length) {
            await tx.insert(checklistItems).values(
              checklist.items.map((item, itemPosition) => ({
                checklistId: checklistRow!.id,
                title: item.title,
                done: item.done,
                position: itemPosition,
              })),
            );
          }
        }
        if (card.attachments.length) {
          await tx
            .insert(cardAttachments)
            .values(card.attachments.map((a) => ({ cardId, ...a })));
        }
        if (card.comments.length) {
          await tx.insert(cardComments).values(
            card.comments.map((comment) => ({
              cardId,
              authorId: comment.authorUserId ?? actor.id,
              body: comment.body,
              createdAt: comment.createdAt,
            })),
          );
        }
      }

      if (args.dryRun) throw new DryRun();
    });
  } catch (error) {
    if (!(error instanceof DryRun)) throw error;
    console.log("🔎 Simulación: no se guardó nada.");
    boardId = 0;
  }

  const count = (pick: (card: (typeof plan.cards)[number]) => number) =>
    plan.cards.reduce((sum, card) => sum + pick(card), 0);
  console.log(
    [
      boardId ? `Tablero creado: «${args.name}» (id=${boardId})` : "",
      delegatesBoard ? "Tipo: tablero de delegados (solo delegados)" : "",
      `Listas: ${plan.lists.join(", ")}`,
      `Etiquetas: ${plan.labels.length}`,
      `Tarjetas: ${plan.cards.length}`,
      `Checklists: ${count((c) => c.checklists.length)} (${count((c) => c.checklists.reduce((s, l) => s + l.items.length, 0))} elementos)`,
      `Responsables asignados: ${count((c) => c.memberUserIds.length)}`,
      `Adjuntos: ${count((c) => c.attachments.length)}`,
      `Comentarios: ${count((c) => c.comments.length)}`,
      `Omitidos: ${plan.skipped.closedCards} tarjetas archivadas, ${plan.skipped.automatedComments} recordatorios automáticos, ${plan.skipped.unnamedLabels} etiquetas sin nombre`,
      `Miembros asociados: ${[...new Set([...matched.values()].map((u) => u.name))].join(", ") || "ninguno"}`,
      unmatched.length
        ? `Sin cuenta: ${unmatched
            .map((m) => `${m.fullName} (@${m.username})`)
            .join(", ")}`
        : "",
      `Registrado como: ${actor.name}`,
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Importación de Trello fallida");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
