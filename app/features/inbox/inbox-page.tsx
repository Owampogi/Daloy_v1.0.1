import { useEffect, useState, useRef } from "react";
import { 
  Bell, Search, Send, Filter, X, ChevronDown, SlidersHorizontal, 
  Check, Clock, AlertCircle, MessageCircle, Users, Tag, 
  ArrowUpDown, Calendar, MoreVertical, RefreshCw 
} from "lucide-react";
import { useOutletContext } from "react-router";
import { supabase } from "~/services/supabase-client";

type Channel = "all" | "tiktok" | "facebook" | "instagram";
type Status = "all" | "open" | "pending" | "closed";
type Priority = "all" | "high" | "medium" | "low";
type SortBy = "latest" | "oldest" | "priority" | "unread";

interface Conversation {
  id: string;
  channel: Exclude<Channel, "all">;
  status: Exclude<Status, "all">;
  priority: Exclude<Priority, "all">;
  last_message: string | null;
  last_message_at: string;
  assigned_to: string | null;
  lead: { full_name: string } | null;
  unread_count?: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender: "lead" | "agent";
  content: string;
  created_at: string;
}

const CHANNEL_CONFIG = {
  tiktok: { label: "TikTok", icon: "🎵", color: "bg-[#1a1a2e]", lightBg: "bg-[#1a1a2e]/10" },
  facebook: { label: "Facebook", icon: "📘", color: "bg-[#1877F2]", lightBg: "bg-[#1877F2]/10" },
  instagram: { label: "Instagram", icon: "📸", color: "bg-[#E1306C]", lightBg: "bg-[#E1306C]/10" },
};

const STATUS_CONFIG = {
  open: { label: "Open", icon: MessageCircle, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
  pending: { label: "Pending", icon: Clock, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
  closed: { label: "Closed", icon: Check, color: "text-gray-500", bg: "bg-gray-50 dark:bg-gray-800" },
};

const PRIORITY_CONFIG = {
  high: { label: "High", icon: AlertCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
  medium: { label: "Medium", icon: AlertCircle, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
  low: { label: "Low", icon: AlertCircle, color: "text-gray-500", bg: "bg-gray-50 dark:bg-gray-800" },
};

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
  "bg-pink-100 text-pink-800 dark:bg-pink-950/50 dark:text-pink-300",
  "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300",
  "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300",
];

// Custom dropdown component
function FilterDropdown({ 
  label, 
  value, 
  options, 
  onChange,
  icon: Icon 
}: any) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt: any) => opt.value === value);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-secondary transition-all text-sm"
      >
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        <span className="text-muted-foreground">{label}:</span>
        <span className="font-medium">{selectedOption?.label || "All"}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 min-w-[160px] bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {options.map((option: any) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-secondary transition-colors flex items-center justify-between ${
                value === option.value ? "bg-secondary text-foreground" : "text-muted-foreground"
              }`}
            >
              {option.label}
              {value === option.value && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Quick filter chip component
function QuickFilterChip({ active, onClick, label, count }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
        active 
          ? "bg-primary text-primary-foreground shadow-sm" 
          : "bg-secondary text-muted-foreground hover:bg-secondary/80"
      }`}
    >
      {label}
      {count !== undefined && (
        <span className={`ml-1.5 ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (mins > 0) return `${mins}m`;
  return "now";
}

export default function InboxPage() {
  const { user, displayName, initials } = useOutletContext<any>();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [search, setSearch] = useState("");
  const [filterChannel, setFilterChannel] = useState<Channel>("all");
  const [filterStatus, setFilterStatus] = useState<Status>("all");
  const [filterPriority, setFilterPriority] = useState<Priority>("all");
  const [sortBy, setSortBy] = useState<SortBy>("latest");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  // Get quick filter counts
  const getStatusCount = (status: Status) => {
    if (status === "all") return conversations.length;
    return conversations.filter(c => c.status === status).length;
  };

  const getPriorityCount = (priority: Priority) => {
    if (priority === "all") return conversations.length;
    return conversations.filter(c => c.priority === priority).length;
  };

  // Fetch org + conversations
  useEffect(() => {
    if (!user) return;
    async function init() {
      const { data: memberData } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();
      if (!memberData) return;
      setOrgId(memberData.organization_id);
      fetchConversations(memberData.organization_id);
    }
    init();
  }, [user]);

  async function fetchConversations(oid: string) {
    const { data } = await supabase
      .from("conversations")
      .select("*, lead:leads(full_name)")
      .eq("organization_id", oid)
      .order("last_message_at", { ascending: false });
    setConversations(data ?? []);
  }

  // Fetch messages when conversation selected
  useEffect(() => {
    if (!selected) return;
    async function fetchMessages() {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selected!.id)
        .order("created_at", { ascending: true });
      setMessages(data ?? []);
    }
    fetchMessages();

    const channel = supabase
      .channel(`messages:${selected.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${selected.id}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selected]);

  async function sendReply() {
    if (!reply.trim() || !selected) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Use Edge Function to send message through the correct platform API
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            conversation_id: selected.id,
            content: reply.trim(),
          }),
        }
      );

      const result = await res.json();
      if (!res.ok) {
        console.error("Send failed:", result.error);
        // Fallback: save directly to DB if Edge Function fails (e.g. during dev)
        await supabase.from("messages").insert({
          conversation_id: selected.id,
          sender: "agent",
          content: reply.trim(),
        });
      }

      await supabase.from("conversations").update({
        last_message: reply.trim(),
        last_message_at: new Date().toISOString(),
      }).eq("id", selected.id);

      setReply("");
      if (orgId) fetchConversations(orgId);
    } catch (err) {
      console.error("Error sending reply:", err);
    }
  }

  // Sort conversations
  const getSortedConversations = (convs: Conversation[]) => {
    switch (sortBy) {
      case "latest":
        return [...convs].sort((a, b) => 
          new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
        );
      case "oldest":
        return [...convs].sort((a, b) => 
          new Date(a.last_message_at).getTime() - new Date(b.last_message_at).getTime()
        );
      case "priority":
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return [...convs].sort((a, b) => 
          priorityOrder[b.priority] - priorityOrder[a.priority]
        );
      default:
        return convs;
    }
  };

  const filtered = getSortedConversations(
    conversations.filter((c) => {
      const name = c.lead?.full_name ?? "";
      if (search && !name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterChannel !== "all" && c.channel !== filterChannel) return false;
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      if (filterPriority !== "all" && c.priority !== filterPriority) return false;
      return true;
    })
  );

  const activeFilterCount = [filterChannel, filterStatus, filterPriority].filter(f => f !== "all").length;

  return (
    <>
      {/* Topbar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/70 bg-background/95 backdrop-blur-xl px-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Inbox</h1>
            <p className="text-xs text-muted-foreground">
              {filtered.length} conversation{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button 
            onClick={() => fetchConversations(orgId!)}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary transition-colors">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
          </button>
          <div className="flex h-9 items-center gap-2 rounded-full border border-border bg-background pl-1 pr-3">
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt={displayName} className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-xs font-semibold text-primary-foreground">
                {initials}
              </span>
            )}
            <span className="hidden text-sm font-medium sm:inline">{displayName}</span>
          </div>
        </div>
      </header>

      {/* Inbox body */}
      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>

        {/* Left: conversation list */}
        <div className="flex w-[400px] shrink-0 flex-col border-r border-border bg-background">

          {/* Search and Filter Bar */}
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full rounded-lg border border-border bg-secondary/50 pl-9 pr-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`relative px-3 py-2 rounded-lg border transition-all ${
                  activeFilterCount > 0 
                    ? "border-primary bg-primary/10 text-primary" 
                    : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary"
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Quick Status Filters */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              <QuickFilterChip
                active={filterStatus === "all"}
                onClick={() => setFilterStatus("all")}
                label="All"
                count={conversations.length}
              />
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <QuickFilterChip
                  key={key}
                  active={filterStatus === key}
                  onClick={() => setFilterStatus(key as Status)}
                  label={config.label}
                  count={getStatusCount(key as Status)}
                />
              ))}
            </div>

            {/* Expandable Advanced Filters */}
            {showFilters && (
              <div className="pt-3 border-t border-border space-y-3 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Advanced filters</span>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={() => {
                        setFilterChannel("all");
                        setFilterStatus("all");
                        setFilterPriority("all");
                      }}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <FilterDropdown
                    label="Channel"
                    value={filterChannel}
                    options={[
                      { value: "all", label: "All Channels" },
                      { value: "tiktok", label: "TikTok" },
                      { value: "facebook", label: "Facebook" },
                      { value: "instagram", label: "Instagram" },
                    ]}
                    onChange={setFilterChannel}
                    icon={Tag}
                  />

                  <FilterDropdown
                    label="Priority"
                    value={filterPriority}
                    options={[
                      { value: "all", label: "All Priorities" },
                      { value: "high", label: "High" },
                      { value: "medium", label: "Medium" },
                      { value: "low", label: "Low" },
                    ]}
                    onChange={setFilterPriority}
                    icon={AlertCircle}
                  />

                  <FilterDropdown
                    label="Sort by"
                    value={sortBy}
                    options={[
                      { value: "latest", label: "Latest" },
                      { value: "oldest", label: "Oldest" },
                      { value: "priority", label: "Priority" },
                    ]}
                    onChange={setSortBy}
                    icon={ArrowUpDown}
                  />
                </div>

                {/* Active filter chips */}
                {activeFilterCount > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {filterChannel !== "all" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs">
                        {CHANNEL_CONFIG[filterChannel as keyof typeof CHANNEL_CONFIG]?.label || filterChannel}
                        <X onClick={() => setFilterChannel("all")} className="h-3 w-3 cursor-pointer hover:text-primary/70" />
                      </span>
                    )}
                    {filterPriority !== "all" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs">
                        Priority: {PRIORITY_CONFIG[filterPriority as keyof typeof PRIORITY_CONFIG]?.label}
                        <X onClick={() => setFilterPriority("all")} className="h-3 w-3 cursor-pointer hover:text-primary/70" />
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <MessageCircle className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">No conversations found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try adjusting your filters or search
                </p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => {
                      setFilterChannel("all");
                      setFilterStatus("all");
                      setFilterPriority("all");
                    }}
                    className="mt-4 text-xs text-primary hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((conv, i) => {
                  const name = conv.lead?.full_name ?? "Unknown";
                  const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length];
                  const isActive = selected?.id === conv.id;
                  const StatusIcon = STATUS_CONFIG[conv.status].icon;
                  const PriorityIcon = PRIORITY_CONFIG[conv.priority].icon;
                  
                  return (
                    <div
                      key={conv.id}
                      onClick={() => setSelected(conv)}
                      className={`group relative px-4 py-3 cursor-pointer transition-all duration-200 ${
                        isActive 
                          ? "bg-gradient-to-r from-primary/5 to-transparent border-l-2 border-l-primary" 
                          : "hover:bg-secondary/50"
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${avatarColor}`}>
                          {getInitials(name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-sm font-semibold text-foreground truncate">{name}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0 ml-1 font-mono">
                              {timeAgo(conv.last_message_at)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mb-2">
                            {conv.last_message ?? "No messages yet"}
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <span className="text-xs">{CHANNEL_CONFIG[conv.channel]?.icon}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {CHANNEL_CONFIG[conv.channel]?.label}
                              </span>
                            </div>
                            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${STATUS_CONFIG[conv.status].bg}`}>
                              <StatusIcon className={`h-2.5 w-2.5 ${STATUS_CONFIG[conv.status].color}`} />
                              <span className={`text-[10px] font-medium ${STATUS_CONFIG[conv.status].color}`}>
                                {STATUS_CONFIG[conv.status].label}
                              </span>
                            </div>
                            {conv.priority !== "low" && (
                              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${PRIORITY_CONFIG[conv.priority].bg}`}>
                                <PriorityIcon className={`h-2.5 w-2.5 ${PRIORITY_CONFIG[conv.priority].color}`} />
                                <span className={`text-[10px] font-medium ${PRIORITY_CONFIG[conv.priority].color}`}>
                                  {PRIORITY_CONFIG[conv.priority].label}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: chat detail */}
        <div className="flex flex-1 flex-col bg-background">
          {selected ? (
            <>
              {/* Chat header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-background to-secondary/30">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <span className="text-lg">
                      {CHANNEL_CONFIG[selected.channel]?.icon}
                    </span>
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground">
                      {selected.lead?.full_name ?? "Unknown"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        #{selected.id.slice(0, 8)}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {CHANNEL_CONFIG[selected.channel]?.label}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg text-muted-foreground hover:bg-secondary hover:border-secondary transition-all">
                    Assign
                  </button>
                  <button className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all shadow-sm">
                    Resolve
                  </button>
                  <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-all">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                      <MessageCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No messages yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === "agent" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-200`}>
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        msg.sender === "agent"
                          ? "bg-primary text-primary-foreground rounded-br-sm shadow-sm"
                          : "bg-secondary text-foreground rounded-bl-sm"
                      }`}>
                        {msg.content}
                        <p className={`text-[10px] mt-1.5 ${
                          msg.sender === "agent" 
                            ? "text-primary-foreground/60 text-right" 
                            : "text-muted-foreground"
                        }`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Reply bar */}
              <div className="px-6 py-4 border-t border-border bg-gradient-to-t from-background to-transparent">
                <div className="flex gap-3 items-center">
                  <input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendReply()}
                    placeholder="Type a reply..."
                    className="flex-1 rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                  <button
                    onClick={sendReply}
                    disabled={!reply.trim()}
                    className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-all shadow-sm"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6">
                <MessageCircle className="h-12 w-12 text-muted-foreground/40" />
              </div>
              <p className="text-base font-semibold text-foreground">Select a conversation</p>
              <p className="text-sm text-muted-foreground mt-1">Choose from the list to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}