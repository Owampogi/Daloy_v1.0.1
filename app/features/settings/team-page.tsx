import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  MoreVertical,
  Loader2,
} from "lucide-react";
import { supabase } from "~/services/supabase-client";

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string;
  };
}

export default function TeamPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    loadTeam();
  }, []);

  async function loadTeam() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      // Get user's organization
      const { data: memberData } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", session.user.id)
        .single();

      if (!memberData) return;
      setOrgId(memberData.organization_id);

      // Get team members with profiles
      const { data: teamData } = await supabase
        .from("organization_members")
        .select(`
          id,
          user_id,
          role,
          created_at
        `)
        .eq("organization_id", memberData.organization_id)
        .order("created_at", { ascending: true });

      if (teamData) {
        // Get profiles for each member
        const userIds = teamData.map((m) => m.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

        const membersWithProfiles = teamData.map((member) => ({
          ...member,
          profiles: profileMap.get(member.user_id),
        }));

        setMembers(membersWithProfiles);
      }
    } catch (err) {
      console.error("Error loading team:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite() {
    if (!inviteEmail || !orgId) return;
    setInviting(true);

    try {
      // In production, this would send an email invitation
      // For now, we'll show a message
      alert(`Invitation sent to ${inviteEmail}! (This is a demo - in production, an email would be sent)`);
      setShowInviteModal(false);
      setInviteEmail("");
    } catch (err) {
      console.error("Error inviting:", err);
      alert("Failed to send invitation. Please try again.");
    } finally {
      setInviting(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm("Are you sure you want to remove this team member?")) return;

    try {
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
      await loadTeam();
    } catch (err) {
      console.error("Error removing member:", err);
      alert("Failed to remove member. Please try again.");
    }
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    try {
      const { error } = await supabase
        .from("organization_members")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) throw error;
      await loadTeam();
    } catch (err) {
      console.error("Error updating role:", err);
      alert("Failed to update role. Please try again.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const roleColors: Record<string, string> = {
    owner: "bg-purple-100 text-purple-700",
    admin: "bg-blue-100 text-blue-700",
    member: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Team Members</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage who has access to your organization
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="btn-primary h-10 px-4 text-sm"
        >
          <UserPlus className="h-4 w-4" />
          Invite Member
        </button>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-sm text-muted-foreground">Total Members</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{members.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-sm text-muted-foreground">Owners</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {members.filter((m) => m.role === "owner").length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-sm text-muted-foreground">Admins</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {members.filter((m) => m.role === "admin").length}
          </p>
        </div>
      </div>

      {/* Members List */}
      <div className="rounded-xl border border-border bg-background overflow-hidden">
        <div className="divide-y divide-border">
          {members.map((member) => {
            const displayName = member.profiles?.full_name || "Unknown User";
            const initials = displayName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <div key={member.id} className="flex items-center gap-4 p-4 hover:bg-secondary/30 transition-colors">
                {/* Avatar */}
                {member.profiles?.avatar_url ? (
                  <img
                    src={member.profiles.avatar_url}
                    alt={displayName}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {initials}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    Joined {new Date(member.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Role Badge */}
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${roleColors[member.role] || "bg-gray-100 text-gray-700"}`}>
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </span>

                {/* Actions */}
                {member.role !== "owner" && (
                  <div className="flex items-center gap-2">
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                      className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                    </select>
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Shield className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">Invite Team Member</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Send an invitation to join your organization
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </span>
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="input-field"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Role
                  </span>
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="input-field"
                >
                  <option value="member">Member - Can view and manage leads</option>
                  <option value="admin">Admin - Full access except billing</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail("");
                }}
                className="btn-surface h-10 px-4 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={!inviteEmail || inviting}
                className="btn-primary h-10 px-4 text-sm"
              >
                {inviting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}