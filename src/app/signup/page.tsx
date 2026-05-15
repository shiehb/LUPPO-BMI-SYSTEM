import { SignupForm } from "@/components/signup-form"
import AuthCard from "@/components/auth-card"

export default function Page() {
  return (
    <AuthCard
      title="Create an Account"
      description="Register with your LUPPO credentials"
      scrollable
    >
      <SignupForm />
    </AuthCard>
  )
}
