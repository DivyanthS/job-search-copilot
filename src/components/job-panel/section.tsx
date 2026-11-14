import { cn } from "@/lib/utils"

export type SaveFn = (patch: import("@/lib/jobs").DetailsPatch) => Promise<boolean>

export function Section({
  icon: Icon,
  title,
  action,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("border-t px-5 py-4", className)}>
      <header className="mb-3 flex min-h-7 items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">{title}</h3>
        {action && <div className="ml-auto">{action}</div>}
      </header>
      {children}
    </section>
  )
}

export function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}
