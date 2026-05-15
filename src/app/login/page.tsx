import { LoginForm } from "@/components/login-form"
import AuthCard from "@/components/auth-card"

export default function Page() {
  return (
    <AuthCard
      title="Login"
      description="Please enter your credentials to access your account.  "
    >
      <LoginForm />
    </AuthCard>
  )
}
