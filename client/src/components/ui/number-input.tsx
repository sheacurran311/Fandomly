import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  allowEmpty?: boolean;
}

/**
 * NumberInput - A properly formatted number input that handles leading zeros correctly
 * 
 * Features:
 * - No leading zeros (200 instead of 0200)
 * - Allows empty field for user experience
 * - Proper min/max validation
 * - Returns null for empty values (or 0 if allowEmpty=false)
 */
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onChange, min, max, allowEmpty = true, className, ...props }, ref) => {
    // Track internal string value for display
    const [displayValue, setDisplayValue] = React.useState<string>(() => 
      value !== null && value !== undefined ? String(value) : ''
    );

    // Update display when value prop changes externally
    React.useEffect(() => {
      setDisplayValue(value !== null && value !== undefined ? String(value) : '');
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      // Allow empty field
      if (inputValue === '' || inputValue === '-') {
        setDisplayValue(inputValue);
        onChange(allowEmpty ? null : (min !== undefined ? min : 0));
        return;
      }

      // Try to parse as number
      const numValue = parseFloat(inputValue);

      // If it's not a valid number, don't update
      if (isNaN(numValue)) {
        return;
      }

      // Apply min/max constraints
      let constrainedValue = numValue;
      if (min !== undefined && numValue < min) {
        constrainedValue = min;
      }
      if (max !== undefined && numValue > max) {
        constrainedValue = max;
      }

      // Update display to show what user typed (but constrained)
      setDisplayValue(String(constrainedValue));
      onChange(constrainedValue);
    };

    const handleBlur = () => {
      // On blur, if empty and not allowed, set to min or 0
      if (displayValue === '' || displayValue === '-') {
        if (!allowEmpty) {
          const fallbackValue = min !== undefined ? min : 0;
          setDisplayValue(String(fallbackValue));
          onChange(fallbackValue);
        }
      } else {
        // Clean up display value (remove leading zeros, etc)
        const numValue = parseFloat(displayValue);
        if (!isNaN(numValue)) {
          setDisplayValue(String(numValue));
        }
      }
    };

    return (
      <Input
        {...props}
        ref={ref}
        type="number"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        min={min}
        max={max}
        className={cn("no-spinner", className)}
      />
    );
  }
);

NumberInput.displayName = "NumberInput";

