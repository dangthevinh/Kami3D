import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "shimmer relative overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/8",
        className,
      )}
      {...props}
    />
  );
}
