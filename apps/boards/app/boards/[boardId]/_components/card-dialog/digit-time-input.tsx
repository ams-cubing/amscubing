"use client";

import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { cn } from "@workspace/ui/lib/utils";

import {
  digitsToCentiseconds,
  formatDigitsDisplay,
  sanitizeDigitInput,
} from "@/lib/digit-time";

export function DigitTimeInput({
  id,
  label,
  placeholder,
  digits,
  onDigitsChange,
  hint,
  disabled,
  className,
}: {
  id: string;
  label: string;
  placeholder: string;
  digits: string;
  onDigitsChange: (digits: string) => void;
  hint?: string;
  disabled?: boolean;
  className?: string;
}) {
  const display = formatDigitsDisplay(digits);
  const parsed = digitsToCentiseconds(digits);
  const invalid = parsed === "invalid";

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const incoming = event.target.value;
    const nextDigits = sanitizeDigitInput(incoming);

    // Deleting a formatting character (":" / ".") leaves the same digits;
    // treat that as removing the last digit (digit-pad backspace).
    if (
      incoming.length < display.length &&
      nextDigits.length >= digits.length
    ) {
      onDigitsChange(digits.slice(0, -1));
      return;
    }

    onDigitsChange(nextDigits);
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    onDigitsChange(sanitizeDigitInput(event.clipboardData.getData("text")));
  }

  return (
    <div className={cn("space-y-1", className)}>
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={display}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={cn(invalid && "border-destructive")}
        onChange={handleChange}
        onPaste={handlePaste}
      />
      {hint ? (
        <p className="text-muted-foreground text-[0.65rem] leading-snug">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
