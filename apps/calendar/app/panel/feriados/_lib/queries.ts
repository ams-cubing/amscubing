import { db } from "@workspace/db";
import { holidays } from "@workspace/db/schema";
import { and, asc, gte, lte } from "drizzle-orm";

export async function getHolidaysForYear(year: number) {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  return db.query.holidays.findMany({
    where: and(gte(holidays.date, start), lte(holidays.date, end)),
    orderBy: [asc(holidays.date)],
  });
}
