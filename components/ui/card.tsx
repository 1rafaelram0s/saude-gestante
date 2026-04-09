import { cn } from "@/lib/utils"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean
}

export function Card({ className, glow, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-bg-card border border-border p-5 transition-all duration-300",
        glow && "hover:border-rose-500/30 hover:shadow-[0_0_30px_rgba(244,63,94,0.08)]",
        className
      )}
      {...props}
    />
  )
}
