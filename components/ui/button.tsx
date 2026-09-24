import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon/70 focus-visible:ring-offset-2 focus-visible:ring-offset-void",
  {
    variants: {
      variant: {
        default:
          "bg-neon text-on-accent font-semibold shadow-[0_10px_30px_-10px_rgba(53,240,192,0.75)] hover:bg-neon/90",
        secondary: "bg-white/8 text-white/90 ring-1 ring-white/12 backdrop-blur hover:bg-white/14",
        outline: "border border-white/15 bg-transparent text-white/85 hover:border-neon/60 hover:text-white",
        ghost: "text-white/70 hover:bg-white/8 hover:text-white",
        danger: "bg-coral/90 text-on-accent hover:bg-coral",
        iris: "bg-iris text-on-accent font-semibold hover:bg-iris/90 shadow-[0_10px_30px_-10px_rgba(169,123,255,0.75)]",
      },
      // `max-sm:` raises the hit area to 44px on a phone and changes nothing on a desktop: the audit
      // (`npm run audit:mobile`) measured the small and icon buttons at 32-40px, which is comfortable
      // with a mouse and not with a thumb. Height, not glyph size — the icons keep their scale.
      size: {
        sm: "h-8 px-3 text-xs max-sm:h-11 max-sm:px-3.5",
        default: "h-10 px-4 max-sm:h-11",
        lg: "h-12 px-6 text-base",
        icon: "size-10 max-sm:size-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  },
);
Button.displayName = "Button";

export { buttonVariants };
