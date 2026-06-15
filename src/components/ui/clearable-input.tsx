import * as React from "react";
import { X } from "lucide-react";
import { Input } from "./input";
import { cn } from "../../lib/utils";

interface ClearableInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear: () => void;
}

export const ClearableInput = React.forwardRef<HTMLInputElement, ClearableInputProps>(
  ({ className, value, onClear, ...props }, ref) => (
    <div className="relative flex-1">
      <Input ref={ref} value={value} className={cn("pr-8", className)} {...props} />
      {value ? (
        <button
          type="button"
          aria-label="Clear"
          tabIndex={-1}
          onClick={onClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  ),
);
ClearableInput.displayName = "ClearableInput";
