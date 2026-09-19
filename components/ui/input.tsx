import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-10 w-full rounded-full bg-white/6 px-4 text-sm text-white placeholder:text-white/40",
        "ring-1 ring-white/10 backdrop-blur transition",
        "hover:ring-white/20 focus:bg-white/10 focus:ring-2 focus:ring-neon/60 focus:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
