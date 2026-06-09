import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Mail,
  Globe,
  CheckCircle2,
  ExternalLink,
  Loader2,
  AlertCircle,
  Unplug,
  Settings2,
} from "lucide-react";
import { supabase } from "~/services/supabase-client";

const CHANNELS = [
  {
    id: "messenger",
    name: "Facebook Messenger",
    icon: "📘",
    color: "#1877F2",
    description: "Connect your Facebook Page to receive and send messages directly from Daloy.",
    features: ["Auto-reply to FAQs", "Lead capture from ads", "Unified inbox"],
    setupTime: "2 min",
    requiresBusinessAccount: true,
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: "📸",
    color: "#E4405F",
    description: "Connect Instagram DMs and Story mentions to manage all conversations in one place.",
    features: ["DM management", "Story mention alerts", "Comment to DM automation"],
    setupTime: "2 min",
    requiresBusinessAccount: true,
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    icon: "💬",
    color: "#25D366",
    description: "Integrate WhatsApp Business API for professional messaging with customers.",
    features: ["Template messages", "Broadcast lists", "Catalog sharing"],
    setupTime: "5 min",
    requiresBusinessAccount: true,
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: "🎵",
    color: "#000000",
    description: "Connect TikTok to capture leads from your viral content and ads.",
    features: ["Lead form integration", "Comment automation", "DM management"],
    setupTime: "3 min",
    requiresBusinessAccount: true,
  },
  {
    id: "email",
    name: "Email",
    icon: "📧",
    color: "#EA4335",
    description: "Connect your business email to send and receive messages from Daloy.",
    features: ["Gmail/Outlook sync", "Email templates", "Auto-forwarding"],
    setupTime: "1 min",
    requiresBusinessAccount: false,
  },
  {
    id: "website",
    name: "Website Chat Widget",
    icon: "🌐",
    color: "#6366F1",
    description: "Add a chat widget to your website to capture and engage visitors.",
    features: ["Custom branding", "Lead capture forms", "Offline messaging"],
    setupTime: "5 min",
    requiresBusinessAccount: false,
  },
];

interface ChannelConnection {
  id: string;
  channel_type: string;
  channel_name: string;
  status: "connected" | "disconnected" | "error";
  connected_at: string | null;
  config: any;
}

export default function ChannelsPage() {
  const navigate = useNavigate();
  const [connections, setConnections] = useState<ChannelConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState<string | null>(null);
  const [configData, setConfigData] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const { data: memberData } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", session.user.id)
        .single();

      if (!memberData) return;
      setOrgId(memberData.organization_id);

      const { data: existingConnections } = await supabase
        .from("channel_connections")
        .select("*")
        .eq("organization_id", memberData.organization_id);

      setConnections(existingConnections || []);
    } catch (err) {
      console.error("Error loading channels:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect(channelId: string) {
    setConnecting(channelId);

    try {
      // OAuth channels — redirect to platform auth
      if (["messenger", "instagram"].includes(channelId)) {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-auth?action=init&org_id=${orgId}&channel=${channelId}`,
          { headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY } }
        );
        const { url } = await res.json();
        if (url) window.location.href = url;
        return;
      }

      if (channelId === "tiktok") {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tiktok-auth?action=init&org_id=${orgId}`,
          { headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY } }
        );
        const { url } = await res.json();
        if (url) window.location.href = url;
        return;
      }

      if (channelId === "email") {
        setShowConfigModal("email");
        setConnecting(null);
        return;
      }

      if (channelId === "website") {
        setShowConfigModal("website");
        setConnecting(null);
        return;
      }

      await loadData();
    } catch (err) {
      console.error("Connection error:", err);
      alert("Failed to connect. Please try again.");
    } finally {
      setConnecting(null);
    }
  }

  async function handleSaveConfig() {
    if (!showConfigModal || !orgId) return;

    setConnecting(showConfigModal);

    try {
      const channel = CHANNELS.find((c) => c.id === showConfigModal);
      
      const { error } = await supabase.from("channel_connections").upsert({
        organization_id: orgId,
        channel_type: showConfigModal,
        channel_name: configData.name || channel?.name,
        status: "connected",
        connected_at: new Date().toISOString(),
        config: configData,
      });

      if (error) throw error;

      setShowConfigModal(null);
      setConfigData({});
      await loadData();
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save configuration. Please try again.");
    } finally {
      setConnecting(null);
    }
  }

  async function handleDisconnect(channelId: string) {
    if (!confirm("Are you sure you want to disconnect this channel?")) return;

    try {
      const { error } = await supabase
        .from("channel_connections")
        .update({ status: "disconnected" })
        .eq("organization_id", orgId)
        .eq("channel_type", channelId);

      if (error) throw error;
      await loadData();
    } catch (err) {
      console.error("Disconnect error:", err);
      alert("Failed to disconnect. Please try again.");
    }
  }

  function getConnectionStatus(channelId: string) {
    const conn = connections.find((c) => c.channel_type === channelId);
    return conn?.status || "disconnected";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Channel Connections</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your messaging channels to unify all customer conversations in one inbox.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-sm text-muted-foreground">Connected Channels</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {connections.filter((c) => c.status === "connected").length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-sm text-muted-foreground">Available Channels</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{CHANNELS.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-sm text-muted-foreground">Messages Today</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">0</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {CHANNELS.map((channel) => {
          const status = getConnectionStatus(channel.id);
          const isConnecting = connecting === channel.id;

          return (
            <div
              key={channel.id}
              className={`relative overflow-hidden rounded-xl border bg-background transition-all ${
                status === "connected"
                  ? "border-green-200 bg-green-50/30"
                  : "border-border hover:border-primary/30"
              }`}
            >
              {status === "connected" && (
                <div className="absolute right-4 top-4">
                  <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Connected
                  </span>
                </div>
              )}

              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                    style={{ backgroundColor: `${channel.color}15` }}
                  >
                    {channel.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{channel.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{channel.description}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    {channel.features.map((feature) => (
                      <span
                        key={feature}
                        className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Setup: {channel.setupTime}</span>
                  {channel.requiresBusinessAccount && (
                    <span>Requires business account</span>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-3">
                  {status === "connected" ? (
                    <>
                      <button className="btn-surface h-9 px-3 text-xs">
                        <Settings2 className="h-3.5 w-3.5" />
                        Configure
                      </button>
                      <button
                        onClick={() => handleDisconnect(channel.id)}
                        className="h-9 px-3 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Unplug className="h-3.5 w-3.5" />
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleConnect(channel.id)}
                      disabled={isConnecting}
                      className="btn-primary h-9 px-4 text-xs"
                      style={!isConnecting ? { backgroundColor: channel.color } : undefined}
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-3.5 w-3.5" />
                          Connect {channel.name}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h4 className="font-medium text-foreground">Need help connecting?</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Check our setup guides or contact support for assistance with channel integrations.
            </p>
          </div>
        </div>
      </div>

      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">
              {showConfigModal === "email" ? "Connect Email" : "Setup Website Widget"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {showConfigModal === "email"
                ? "Enter your email credentials to start receiving messages."
                : "Get your embed code to add the chat widget to your website."}
            </p>

            <div className="mt-6 space-y-4">
              {showConfigModal === "email" ? (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={configData.email || ""}
                      onChange={(e) => setConfigData({ ...configData, email: e.target.value })}
                      placeholder="support@yourbusiness.com"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      SMTP Server
                    </label>
                    <input
                      type="text"
                      value={configData.smtp || ""}
                      onChange={(e) => setConfigData({ ...configData, smtp: e.target.value })}
                      placeholder="smtp.gmail.com"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Password / App Password
                    </label>
                    <input
                      type="password"
                      value={configData.password || ""}
                      onChange={(e) => setConfigData({ ...configData, password: e.target.value })}
                      placeholder="••••••••"
                      className="input-field"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Website URL
                    </label>
                    <input
                      type="url"
                      value={configData.website || ""}
                      onChange={(e) => setConfigData({ ...configData, website: e.target.value })}
                      placeholder="https://yourbusiness.com"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Widget Name
                    </label>
                    <input
                      type="text"
                      value={configData.name || ""}
                      onChange={(e) => setConfigData({ ...configData, name: e.target.value })}
                      placeholder="My Business Chat"
                      className="input-field"
                    />
                  </div>
                  <div className="rounded-lg bg-secondary p-4">
                    <p className="text-xs font-medium text-foreground">Embed Code</p>
                    <code className="mt-2 block rounded bg-background p-3 text-xs text-muted-foreground">
                      {`<script src="https://daloy.app/widget.js" data-org="${orgId}"></script>`}
                    </code>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfigModal(null);
                  setConfigData({});
                }}
                className="btn-surface h-10 px-4 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={connecting !== null}
                className="btn-primary h-10 px-4 text-sm"
              >
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save & Connect"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}