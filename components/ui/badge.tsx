import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 backdrop-blur-sm transition-colors",
  {
    variants: {
      variant: {
        default: "bg-white/8 text-white/80 ring-white/12",
        neon: "bg-neon/12 text-neon ring-neon/30",
        iris: "bg-iris/12 text-iris ring-iris/30",
        solar: "bg-solar/12 text-solar ring-solar/30",
        coral: "bg-coral/12 text-coral ring-coral/30",
        outline: "bg-transparent text-white/70 ring-white/18",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
