import { db } from "@workspace/db";
import { courseStaff, user } from "@workspace/db/schema";
import { sql } from "drizzle-orm";
import { z } from "zod";

const email = z.string().email().parse(process.argv[2]).trim().toLowerCase();
const role = z
  .enum(["administrator", "developer", "instructor"])
  .parse(process.argv[3]);
const [target] = await db
  .select()
  .from(user)
  .where(sql`lower(${user.email}) = ${email}`);
if (!target || !target.emailVerified)
  throw new Error("La cuenta debe iniciar sesión con WCA primero");
await db
  .insert(courseStaff)
  .values({ userId: target.id, role })
  .onConflictDoUpdate({ target: courseStaff.userId, set: { role } });
console.log(`Permiso de Cursos asignado: ${role}`);
process.exit(0);
