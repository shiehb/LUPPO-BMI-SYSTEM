import { SignupForm } from "@/components/signup-form"
import { ShieldCheck } from "lucide-react"

export default function Page() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left: LUPPO branding panel */}
      <div className="relative hidden lg:flex flex-col gap-6 bg-[oklch(0.28_0.14_265)] p-10 text-white">
        <div className="flex items-center gap-3 text-lg font-semibold">
          <div className="flex size-9 items-center justify-center rounded-md bg-white/15">
            <ShieldCheck className="size-5" />
          </div>
          <span>LUPPO BMI System</span>
        </div>
        <div className="mt-auto">
          <blockquote className="space-y-2">
            <p className="text-2xl font-bold leading-snug">
              La Union Police Provincial Office
            </p>
            <p className="text-sm text-white/70">
              Body Mass Index Tracking &amp; Health Monitoring System
            </p>
          </blockquote>
        </div>
      </div>

      {/* Right: signup form — scrollable on small screens */}
      <div className="flex items-start justify-center overflow-y-auto p-6 md:p-10">
        <div className="w-full max-w-lg py-4">
          <SignupForm />
        </div>
      </div>
    </div>
  )
}
