/**
 * @see https://gist.github.com/rphlmr/0d1722a794ed5a16da0fdf6652902b15
 */

import { type AnyColumn, sql } from "drizzle-orm";

/** Narrows user rows to those linked to a WCA ID (delegates, organizers). */
export function hasWcaId<T extends { wcaId: string | null }>(
  row: T,
): row is T & { wcaId: string } {
  return row.wcaId !== null;
}

export function isEmpty<TColumn extends AnyColumn>(column: TColumn) {
  return sql<boolean>`
    case
      when ${column} is null then true
      when ${column} = '' then true
      when ${column}::text = '[]' then true
      when ${column}::text = '{}' then true
      else false
    end
  `;
}
