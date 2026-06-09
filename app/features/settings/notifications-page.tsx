import { useState } from "react";
import { Bell, Mail, MessageSquare, Save, Loader2, CheckCircle2 } from "lucide-react";

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  email: boolean;
  push: boolean;
}

export default function NotificationsPage() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      id: "new_lead",
      label: "New Lead",
      description: "When a new lead is captured from any channel",
      email: true,
      push: true,
    },
    {
      id: "new_message",
      label: "New Message",
      description: "When a customer sends a new message",
      email: false,
      push: true,
    },
    {
      id: "lead_assigned",
      label: "Lead Assigned",
      description: "When a lead is assigned to you",
      email: true,
      push: true,
    },
    {
      id: "follow_up_reminder",
      label: "Follow-up Reminder",
      description: "When a follow-up is due",
      email: true,
      push: true,
    },
    {
      id: "appointment_reminder",
      label: "Appointment Reminder",
      description: "Before an upcoming appointment",
      email: true,
      push: true,
    },
    {
      id: "ai_escalation",
      label: "AI Escalation",
      description: "When AI needs human assistance",
      email: true,
      push: true,
    },
    {
      id: "weekly_digest",
      label: "Weekly Digest",
      description: "Summary of weekly activity and metrics",
      email: true,
      push: false,
    },
  ]);

  const handleToggle = (id: string, type: "email" | "push") => {
    setSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [type]: !s[type] } : s))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Notification Preferences</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose how and when you want to be notified
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary h-10 px-4 text-sm"
        >
          {saving ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
          ) : saved ? (
            <><CheckCircle2 className="h-4 w-4" /> Saved!</>
          ) : (
            <><Save className="h-4 w-4" /> Save Changes</>
          )}
        </button>
      </div>

      {/* Notification Settings */}
      <div className="rounded-xl border border-border bg-background overflow-hidden">
        <div className="grid grid-cols-[1fr,80px,80px] items-center gap-4 px-6 py-3 border-b border-border bg-secondary/30">
          <span className="text-xs font-medium text-muted-foreground">NOTIFICATION</span>
          <div className="flex items-center justify-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Email</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <Bell className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Push</span>
          </div>
        </div>
        {settings.map((setting) => (
          <div
            key={setting.id}
            className="grid grid-cols-[1fr,80px,80px] items-center gap-4 px-6 py-4 border-b border-border last:border-0 hover:bg-secondary/20 transition-colors"
          >
            <div>
              <p className="font-medium text-foreground text-sm">{setting.label}</p>
              <p className="text-xs text-muted-foreground">{setting.description}</p>
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => handleToggle(setting.id, "email")}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  setting.email ? "bg-primary" : "bg-border"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    setting.email ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => handleToggle(setting.id, "push")}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  setting.push ? "bg-primary" : "bg-border"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    setting.push ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}