import { db } from "@workspace/db";
import { blogStaff, user } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
const id = process.argv[2];
const role = z
  .enum(["administrator", "developer", "editor"])
  .parse(process.argv[3] ?? "administrator");
if (!id) throw new Error("Uso: staff:grant <user-id> <role>");
const [member] = await db.select().from(user).where(eq(user.id, id));
if (!member?.emailVerified)
  throw new Error("Cuenta no disponible o correo sin verificar");
await db
  .insert(blogStaff)
  .values({ userId: id, role })
  .onConflictDoUpdate({ target: blogStaff.userId, set: { role } });
console.log("Permiso de Blog actualizado");
process.exit(0);
