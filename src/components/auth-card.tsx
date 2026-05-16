import { Card, CardHeader } from "@/components/ui/card"
import { LogoImage } from "@/components/logo-image"
import { cn } from "@/lib/utils"

interface AuthCardProps {
  title: string
  description: string
  children: React.ReactNode
  scrollable?: boolean
}

export default function AuthCard({
  title,
  description,
  children,
  scrollable = false,
}: AuthCardProps) {
  return (
    <>
      {/* Fixed floating header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2 px-4 py-3">
          <LogoImage src="/pnp-logo.webp" alt="PNP" className="h-10 w-10 md:h-12 md:w-12" />

          <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
            <p className="text-[11px] md:text-sm font-bold uppercase tracking-wider md:tracking-widest text-foreground leading-tight">
              LUPPO BMI SYSTEM
            </p>
            <p className="text-[10px] md:text-xs text-slate-500 leading-tight text-center">
              La Union Police Provincial Office
            </p>
          </div>

          <LogoImage src="/pro1-logo.webp" alt="PRO 1" className="h-10 w-10 md:h-12 md:w-12" />
        </div>
      </header>

      {/* Page content pushed below the fixed header */}
      <main
        className={cn(
          "min-h-screen bg-slate-50 flex flex-col items-center px-4 pt-24 pb-8",
          !scrollable && "md:justify-center"
        )}
      >
        <Card
          className={cn(
            "w-full max-w-md",
            "shadow-none border-0 bg-transparent ring-0",
            "md:bg-white md:border md:border-slate-100 md:shadow-xl"
          )}
        >
          <CardHeader className="flex flex-col items-center text-center gap-1 pb-4">
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </CardHeader>

          {children}
        </Card>
      </main>
    </>
  )
}
