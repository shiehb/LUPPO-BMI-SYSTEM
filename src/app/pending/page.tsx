import { Clock } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import AuthCard from "@/components/auth-card";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function PendingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, is_approved")
    .eq("id", user.id)
    .single();

  // Already approved — send them to their dashboard
  if (profile?.is_approved) redirect("/dashboard/my-profile");

  return (
    <AuthCard
      title="Account Pending Approval"
      description="Your registration has been received."
    >
      <CardContent className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 ring-1 ring-amber-200">
          <Clock className="size-7 text-amber-600" />
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Hello{profile?.full_name ? `, ${profile.full_name}` : ""}. Your account is currently
            awaiting approval from a system administrator.
          </p>
          <p className="text-sm text-muted-foreground">
            You will be able to access the system once your account has been reviewed and approved.
            Please contact your unit&apos;s administrator if this takes longer than expected.
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            const { createClient: createServerClient } = await import("@/lib/supabase/server");
            const sb = await createServerClient();
            await sb.auth.signOut();
            redirect("/login");
          }}
        >
          <button
            type="submit"
            className="mt-2 text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </form>
      </CardContent>
    </AuthCard>
  );
}
