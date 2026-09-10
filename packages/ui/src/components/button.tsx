import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@workspace/ui/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_6px_16px_rgba(0,154,68,0.3)] hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_6px_16px_rgba(186,12,47,0.28)] hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        accent:
          "bg-ams-orange text-white shadow-[0_6px_16px_rgba(254,80,0,0.28)] hover:bg-ams-orange/90",
        brand:
          "bg-ams-navy text-white shadow-[0_6px_16px_rgba(1,11,25,0.28)] hover:bg-ams-navy/90",
        outline:
          "border border-border bg-background shadow-xs hover:bg-secondary hover:text-secondary-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost:
          "hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-accent/20",
        link: "text-primary underline-offset-4 hover:underline shadow-none",
        glass:
          "ams-glass border border-white/25 bg-white/10 text-white shadow-[0_6px_16px_rgba(0,0,0,0.18)] hover:bg-white/18",
      },
      size: {
        default: "h-10 px-5 py-2 has-[>svg]:px-4",
        sm: "h-8 gap-1.5 px-3 text-xs has-[>svg]:px-2.5",
        lg: "h-12 px-7 py-3 has-[>svg]:px-5",
        icon: "size-9 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
