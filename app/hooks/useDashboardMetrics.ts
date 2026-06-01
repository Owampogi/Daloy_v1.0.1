import { useEffect, useState } from "react";
import { supabase } from "~/services/supabase-client";

export function useDashboardMetrics() {
  const [metrics, setMetrics] = useState({
    totalLeads: 0,
    openFollowUps: 0,
    appointments: 0,
    aiRepliesUsed: 0,
    is_active: 0,
    triggered_count: 0,
    last_triggered_at: 0,
  });

  useEffect(() => {
    async function fetchMetrics() {
      const [
        { count: totalLeads },
        { count: openFollowUps },
        { count: appointments },
      ] = await Promise.all([
        supabase.from("leads").select("*", { count: "exact", head: true }),
        supabase.from("leads").select("*", { count: "exact", head: true })
          .eq("status", "follow-up"),
        supabase.from("appointments").select("*", { count: "exact", head: true })
          .gte("date", new Date().toISOString()),
      ]);

      setMetrics({
        totalLeads: totalLeads ?? 0,
        openFollowUps: openFollowUps ?? 0,
        appointments: appointments ?? 0,
        aiRepliesUsed: 0, // from your plan/usage table
        is_active: 0, // from your org table
        triggered_count: 0, // from your usage table
        last_triggered_at: 0, // from your usage table
      });
    }

    fetchMetrics();
  }, []);

  return metrics;
}