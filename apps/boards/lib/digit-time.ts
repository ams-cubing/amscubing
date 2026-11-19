const MAX_DIGITS = 8;

/**
 * Parse a digit-pad time string (e.g. "4534" → 45.34, "23454" → 2:34.54).
 * Digits are read from the right as …mmsscc. Returns null for empty input,
 * and "invalid" when the seconds chunk is ≥ 60.
 */
export function digitsToCentiseconds(
  digits: string,
): number | null | "invalid" {
  if (digits === "") return null;
  if (!/^\d+$/.test(digits)) return "invalid";

  const padded = digits.padStart(4, "0");
  const centiseconds = Number(padded.slice(-2));
  const seconds = Number(padded.slice(-4, -2));
  const minutes = Number(padded.slice(0, -4) || "0");

  if (seconds >= 60) return "invalid";

  return (minutes * 60 + seconds) * 100 + centiseconds;
}

/**
 * Format digit-pad input for display, including invalid seconds (e.g. "9:99.99").
 */
export function formatDigitsDisplay(digits: string): string {
  if (digits === "") return "";
  const padded = digits.padStart(4, "0");
  const cs = padded.slice(-2);
  const sec = padded.slice(-4, -2);
  const min = padded.slice(0, -4);
  if (min === "" || min === "0") {
    return `${Number(sec)}.${cs}`;
  }
  return `${Number(min)}:${sec}.${cs}`;
}

/** Keep only digits, capped for digit-pad fields. */
export function sanitizeDigitInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, MAX_DIGITS);
}

/** Format stored centiseconds as WCA-style time text. */
export function formatDigitTime(centiseconds: number): string {
  const total = Math.max(0, Math.round(centiseconds));
  const minutes = Math.floor(total / 6000);
  const rem = total % 6000;
  const seconds = Math.floor(rem / 100);
  const cs = rem % 100;
  if (minutes === 0) {
    return `${seconds}.${String(cs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

/** Convert stored centiseconds back to digit-pad digits. */
export function centisecondsToDigits(centiseconds: number): string {
  const total = Math.max(0, Math.round(centiseconds));
  const minutes = Math.floor(total / 6000);
  const rem = total % 6000;
  const seconds = Math.floor(rem / 100);
  const cs = rem % 100;
  const raw = `${minutes}${String(seconds).padStart(2, "0")}${String(cs).padStart(2, "0")}`;
  return raw.replace(/^0+(?=\d)/, "");
}
