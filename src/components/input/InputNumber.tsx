import * as React from "react";
import { Input } from "@/src/components/ui/input";
import { cn } from "@/src/lib/utils";

export interface InputNumberProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange"
> {
  value: number | string;
  onChange?: (value: number) => void;
  max?: number;
}

const InputNumber = React.forwardRef<HTMLInputElement, InputNumberProps>(
  ({ className, value, onChange, max, ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
        e.preventDefault();
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value;

      // just in case if someone just copy paste, we remove all characters
      val = val.replace(/\D/g, "");

      if (val !== "") {
        const numValue = parseInt(val, 10);

        // handle max value
        if (max !== undefined && numValue > max) {
          onChange?.(max);
        } else {
          onChange?.(numValue);
        }
      } else {
        onChange?.(0);
      }
    };

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value === 0 && props.placeholder ? "" : value}
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        className={cn("tabular-nums", className)}
      />
    );
  },
);
InputNumber.displayName = "InputNumber";

export { InputNumber };
