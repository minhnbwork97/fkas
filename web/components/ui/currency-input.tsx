"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface CurrencyInputProps
  extends Omit<React.ComponentProps<"input">, "type" | "value" | "onChange"> {
  value: string | number;
  onValueChange: (value: string) => void;
  currency?: string;
  locale?: string;
}

/**
 * CurrencyInput component that formats numbers with thousand separators
 * in real-time as user types for better readability.
 * Accepts numeric string or number as value.
 */
export function CurrencyInput({
  value,
  onValueChange,
  currency = "VND",
  locale = "vi-VN",
  className,
  placeholder = "0",
  disabled = false,
  ...props
}: CurrencyInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = React.useState("");

  // Format number with thousand separators
  const formatNumber = React.useCallback(
    (num: string | number): string => {
      if (num === "" || num === null || num === undefined) return "";

      const numStr = typeof num === "number" ? num.toString() : num;
      const cleaned = numStr.replace(/[^\d]/g, "");

      if (cleaned === "") return "";

      const number = parseInt(cleaned, 10);
      if (isNaN(number)) return "";

      return number.toLocaleString(locale);
    },
    [locale]
  );

  // Update display value when external value changes
  React.useEffect(() => {
    const formatted = formatNumber(value);
    setDisplayValue(formatted);
  }, [value, formatNumber]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;

    // Extract only digits
    const cleaned = input.replace(/[^\d]/g, "");

    // Format the cleaned number
    const formatted = formatNumber(cleaned);

    // Calculate how many separators are before cursor in old value
    const oldValue = displayValue;
    const oldSeparatorsBefore = (
      oldValue.slice(0, cursorPosition).match(/[^\d]/g) || []
    ).length;

    // Calculate how many separators are before cursor in new value
    const digitsBeforeCursor = input
      .slice(0, cursorPosition)
      .replace(/[^\d]/g, "").length;
    const newSeparatorsBefore = (
      formatted
        .slice(0, digitsBeforeCursor + oldSeparatorsBefore)
        .match(/[^\d]/g) || []
    ).length;

    // Set the new formatted value
    setDisplayValue(formatted);
    onValueChange(cleaned);

    // Restore cursor position, accounting for separator changes
    setTimeout(() => {
      if (inputRef.current) {
        const newPosition = digitsBeforeCursor + newSeparatorsBefore;
        inputRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter
    if (
      ["Backspace", "Delete", "Tab", "Escape", "Enter"].includes(e.key) ||
      // Allow: Ctrl/Cmd+A, Ctrl/Cmd+C, Ctrl/Cmd+V, Ctrl/Cmd+X
      ((e.ctrlKey || e.metaKey) &&
        ["a", "c", "v", "x"].includes(e.key.toLowerCase())) ||
      // Allow: home, end, left, right
      ["Home", "End", "ArrowLeft", "ArrowRight"].includes(e.key)
    ) {
      return;
    }

    // Ensure that it is a number and stop the keypress if not
    if (e.key < "0" || e.key > "9") {
      e.preventDefault();
    }

    props.onKeyDown?.(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Select all on focus for easy replacement
    setTimeout(() => e.target.select(), 0);
    props.onFocus?.(e);
  };

  return (
    <div className="relative">
      <Input
        {...props}
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn("pr-12", className)}
      />
      {currency && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
          {currency}
        </span>
      )}
    </div>
  );
}
