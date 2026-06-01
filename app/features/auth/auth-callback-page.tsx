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
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/dashboard");
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