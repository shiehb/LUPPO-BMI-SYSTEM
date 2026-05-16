"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Eye, EyeOff, Lock } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function ChangePasswordPage() {
  const router = useRouter()

  const [current, setCurrent]       = useState("")
  const [next, setNext]             = useState("")
  const [confirm, setConfirm]       = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading]         = useState(false)

  const isDisabled = !current.trim() || !next.trim() || !confirm.trim() || loading

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (next !== confirm) {
      toast.error("Passwords do not match. Please try again.")
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
      toast.error("Session expired. Please sign in again.")
      router.push("/login")
      return
    }

    // Reauthenticate to verify the current password before updating
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current,
    })

    if (signInError) {
      toast.error("Current password is incorrect.")
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: next })

    if (updateError) {
      toast.error(updateError.message)
      setLoading(false)
      return
    }

    toast.success("Password updated successfully.")
    router.back()
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>

        <Card className="border border-slate-100 shadow-xl">
          <CardHeader className="flex flex-col items-center text-center gap-1 pb-4">
            <h1 className="text-xl font-semibold">Change Password</h1>
            <p className="text-sm text-muted-foreground">
              Update your account password below.
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <PasswordField
                id="current"
                label="Current Password"
                placeholder="Enter current password"
                value={current}
                onChange={setCurrent}
                show={showCurrent}
                onToggle={() => setShowCurrent((v) => !v)}
              />

              <PasswordField
                id="new"
                label="New Password"
                placeholder="Enter new password"
                value={next}
                onChange={setNext}
                show={showNext}
                onToggle={() => setShowNext((v) => !v)}
              />

              <PasswordField
                id="confirm"
                label="Confirm New Password"
                placeholder="Re-enter new password"
                value={confirm}
                onChange={setConfirm}
                show={showConfirm}
                onToggle={() => setShowConfirm((v) => !v)}
              />

              <Button
                type="submit"
                disabled={isDisabled}
                className="w-full h-11 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Updating…" : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

interface PasswordFieldProps {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggle: () => void
}

function PasswordField({ id, label, placeholder, value, onChange, show, onToggle }: PasswordFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium leading-none">
        {label}
      </label>
      <div className="relative">
        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 pl-9 pr-10"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}
