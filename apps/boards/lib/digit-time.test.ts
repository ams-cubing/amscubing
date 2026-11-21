import { describe, expect, it } from "vitest";

import {
  centisecondsToDigits,
  digitsToCentiseconds,
  formatDigitTime,
  formatDigitsDisplay,
  sanitizeDigitInput,
} from "./digit-time";

describe("digitsToCentiseconds", () => {
  it("returns null for empty input", () => {
    expect(digitsToCentiseconds("")).toBeNull();
  });

  it("parses digit-pad times from the right", () => {
    expect(digitsToCentiseconds("4534")).toBe(4534);
    expect(digitsToCentiseconds("23454")).toBe(15454);
    expect(digitsToCentiseconds("50000")).toBe(30000);
    expect(digitsToCentiseconds("1")).toBe(1);
    expect(digitsToCentiseconds("12")).toBe(12);
    expect(digitsToCentiseconds("123")).toBe(123);
  });

  it("rejects seconds ≥ 60", () => {
    expect(digitsToCentiseconds("99999")).toBe("invalid");
    expect(digitsToCentiseconds("16000")).toBe("invalid");
  });
});

describe("formatDigitsDisplay", () => {
  it("formats digit strings", () => {
    expect(formatDigitsDisplay("")).toBe("");
    expect(formatDigitsDisplay("4534")).toBe("45.34");
    expect(formatDigitsDisplay("23454")).toBe("2:34.54");
    expect(formatDigitsDisplay("50000")).toBe("5:00.00");
  });
});

describe("centisecondsToDigits", () => {
  it("round-trips common times", () => {
    expect(centisecondsToDigits(4534)).toBe("4534");
    expect(centisecondsToDigits(15454)).toBe("23454");
    expect(centisecondsToDigits(30000)).toBe("50000");
    expect(digitsToCentiseconds(centisecondsToDigits(12345))).toBe(12345);
  });
});

describe("sanitizeDigitInput", () => {
  it("keeps digits only and caps length", () => {
    expect(sanitizeDigitInput("12a3")).toBe("123");
    expect(sanitizeDigitInput("123456789")).toBe("12345678");
  });
});

describe("formatDigitTime", () => {
  it("formats like WCA times", () => {
    expect(formatDigitTime(4534)).toBe("45.34");
    expect(formatDigitTime(15454)).toBe("2:34.54");
    expect(formatDigitTime(30000)).toBe("5:00.00");
  });
});
