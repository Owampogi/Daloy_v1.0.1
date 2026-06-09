import { useState } from "react";
import { Shield, Lock, Key, Smartphone, Loader2, CheckCircle2 } from "lucide-react";

export default function SecurityPage() {
  const [changingPassword, setChangingPassword] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Security Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your password and security preferences
        </p>
      </div>

      {/* Password */}
      <div className="rounded-xl border border-border bg-background p-6">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold text-foreground">Change Password</h3>
            <p className="text-sm text-muted-foreground">Update your password regularly for security</p>
          </div>
        </div>

        <div className="space-y-4 max-w-md">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Current Password</label>
            <input type="password" placeholder="••••••••" className="input-field" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">New Password</label>
            <input type="password" placeholder="••••••••" className="input-field" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Confirm New Password</label>
            <input type="password" placeholder="••••••••" className="input-field" />
          </div>
          <button className="btn-primary h-10 px-4 text-sm">
            <Key className="h-4 w-4" />
            Update Password
          </button>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="rounded-xl border border-border bg-background p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold text-foreground">Two-Factor Authentication</h3>
              <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
            </div>
          </div>
          <button className="btn-surface h-9 px-3 text-xs">
            Enable 2FA
          </button>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="rounded-xl border border-border bg-background overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="font-semibold text-foreground">Active Sessions</h3>
          <p className="text-sm text-muted-foreground mt-1">Devices where you're currently logged in</p>
        </div>
        <div className="divide-y divide-border">
          {[
            { device: "Chrome on Windows", location: "Manila, Philippines", current: true, lastActive: "Now" },
            { device: "Safari on iPhone", location: "Manila, Philippines", current: false, lastActive: "2 hours ago" },
          ].map((session, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <Shield className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground text-sm">
                  {session.device}
                  {session.current && (
                    <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                      Current
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {session.location} • {session.lastActive}
                </p>
              </div>
              {!session.current && (
                <button className="text-xs text-red-600 hover:underline">
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}