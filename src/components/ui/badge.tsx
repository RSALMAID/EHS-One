import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Etiqueta de situação. As cores de status ficam reservadas para status. */
export const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      neutro: "bg-slate-100 text-slate-700",
      ok: "bg-emerald-100 text-emerald-800",
      atencao: "bg-amber-100 text-amber-800",
      critico: "bg-red-100 text-red-800",
      info: "bg-sky-100 text-sky-800",
    },
  },
  defaultVariants: { variant: "neutro" },
});

export function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
