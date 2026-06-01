import { useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "~/services/supabase-client";
import { Loader2 } from "lucide-react";

export function loader() {
  return {};
}

function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        // Check if user has already selected a plan
        const { data: member } = await supabase
          .from("organization_members")
          .select("organization_id, organizations(plan, is_trial)")
          .eq("user_id", session.user.id)
          .single();

        if (!member) {
          // No org yet — send to onboarding
          navigate("/onboarding");
          return;
        }

        // Check if plan is still default starter + trial (never selected a plan)
        const org = member.organizations as any;
        if (org?.is_trial && org?.plan === "starter") {
          navigate("/onboarding");
        } else {
          navigate("/dashboard");
        }
      } else {
        navigate("/login");
      }
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}

export default AuthCallbackPage;