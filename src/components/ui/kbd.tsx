import { cn } from "@/lib/utils";

export function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn("rounded border border-slate-200 bg-slate-50 px-1.5 font-mono text-[10px] text-slate-500", className)}
      {...props}
    />
  );
}
