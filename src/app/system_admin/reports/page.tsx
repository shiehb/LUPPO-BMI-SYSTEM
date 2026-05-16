import { FileText } from "lucide-react"

export default function AdminReportsPage() {
  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Reports</p>
            <h1 className="text-3xl font-semibold text-slate-900">BMI Reports</h1>
            <p className="max-w-2xl text-sm text-slate-600">
              This is the new reports hub for BMI data. Report generation and export features will be available soon.
            </p>
          </div>

          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <FileText className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Reports generation feature coming soon</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
              A lightweight reports UI is in place. We’ll add charts, filters, and exports in the next phase.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
