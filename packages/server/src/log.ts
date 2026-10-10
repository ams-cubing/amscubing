type Level = "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

function serialize(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      ...(value.cause !== undefined ? { cause: serialize(value.cause) } : {}),
    };
  }
  return value;
}

function write(level: Level, event: string, fields?: LogFields) {
  const entry: Record<string, unknown> = {
    level,
    event,
    time: new Date().toISOString(),
  };
  if (fields) {
    for (const [key, value] of Object.entries(fields)) {
      entry[key] = serialize(value);
    }
  }

  let line: string;
  try {
    line = JSON.stringify(entry);
  } catch {
    line = JSON.stringify({
      level,
      event,
      time: entry.time,
      unserializable: true,
    });
  }

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  info: (event: string, fields?: LogFields) => write("info", event, fields),
  warn: (event: string, fields?: LogFields) => write("warn", event, fields),
  error: (event: string, fields?: LogFields) => write("error", event, fields),
};
