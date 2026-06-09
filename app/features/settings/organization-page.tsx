import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Building2,
  Clock,
  Save,
  Loader2,
  CheckCircle2,
  Globe,
  Phone,
  MapPin,
} from "lucide-react";
import { supabase } from "~/services/supabase-client";

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  business_hours: {
    start: string;
    end: string;
    timezone: string;
  };
  auto_reply_enabled: boolean;
}

export default function OrganizationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    business_type: "",
    phone: "",
    website: "",
    address: "",
    business_hours_start: "09:00",
    business_hours_end: "18:00",
    timezone: "Asia/Manila",
    auto_reply_enabled: true,
  });

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

      // Get user's organization
      const { data: memberData } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", session.user.id)
        .single();

      if (!memberData) return;
      setOrgId(memberData.organization_id);

      // Get organization details
      const { data: orgData } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", memberData.organization_id)
        .single();

      if (orgData) {
        const hours = orgData.business_hours || { start: "09:00", end: "18:00", timezone: "Asia/Manila" };
        setFormData({
          name: orgData.name || "",
          business_type: "",
          phone: "",
          website: "",
          address: "",
          business_hours_start: hours.start,
          business_hours_end: hours.end,
          timezone: hours.timezone,
          auto_reply_enabled: orgData.auto_reply_enabled ?? true,
        });
      }

      // Get profile details
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (profileData) {
        setFormData((prev) => ({
          ...prev,
          business_type: profileData.business_type || "",
          phone: profileData.phone || "",
        }));
      }
    } catch (err) {
      console.error("Error loading organization:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!orgId) return;
    setSaving(true);
    setSaved(false);

    try {
      // Update organization
      const { error: orgError } = await supabase
        .from("organizations")
        .update({
          name: formData.name,
          business_hours: {
            start: formData.business_hours_start,
            end: formData.business_hours_end,
            timezone: formData.timezone,
          },
          auto_reply_enabled: formData.auto_reply_enabled,
        })
        .eq("id", orgId);

      if (orgError) throw orgError;

      // Update profile
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            business_type: formData.business_type,
            phone: formData.phone,
          })
          .eq("user_id", session.user.id);

        if (profileError) throw profileError;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Error saving:", err);
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Organization Settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your business profile and preferences
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary h-10 px-4 text-sm"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Business Information */}
      <div className="rounded-xl border border-border bg-background p-6">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Business Information</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Business Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Your Business Name"
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Business Type
            </label>
            <select
              value={formData.business_type}
              onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
              className="input-field"
            >
              <option value="">Select type...</option>
              <option value="retail">Retail / E-commerce</option>
              <option value="services">Services</option>
              <option value="restaurant">Restaurant / Food</option>
              <option value="healthcare">Healthcare</option>
              <option value="education">Education</option>
              <option value="real_estate">Real Estate</option>
              <option value="professional">Professional Services</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              <span className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+63 912 345 6789"
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              <span className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Website
              </span>
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://yourbusiness.com"
              className="input-field"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Business Address
              </span>
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Main St, Makati City, Metro Manila"
              className="input-field"
            />
          </div>
        </div>
      </div>

      {/* Business Hours */}
      <div className="rounded-xl border border-border bg-background p-6">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Business Hours</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Opening Time
            </label>
            <input
              type="time"
              value={formData.business_hours_start}
              onChange={(e) => setFormData({ ...formData, business_hours_start: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Closing Time
            </label>
            <input
              type="time"
              value={formData.business_hours_end}
              onChange={(e) => setFormData({ ...formData, business_hours_end: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Timezone
            </label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="input-field"
            >
              <option value="Asia/Manila">Philippines (GMT+8)</option>
              <option value="Asia/Singapore">Singapore (GMT+8)</option>
              <option value="Asia/Hong_Kong">Hong Kong (GMT+8)</option>
              <option value="Asia/Tokyo">Japan (GMT+9)</option>
              <option value="Australia/Sydney">Australia (GMT+10/+11)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Auto-Reply Settings */}
      <div className="rounded-xl border border-border bg-background p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">AI Auto-Reply</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Automatically respond to customer messages using AI
            </p>
          </div>
          <button
            onClick={() => setFormData({ ...formData, auto_reply_enabled: !formData.auto_reply_enabled })}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              formData.auto_reply_enabled ? "bg-primary" : "bg-border"
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                formData.auto_reply_enabled ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        {formData.auto_reply_enabled && (
          <div className="mt-4 rounded-lg bg-green-50 border border-green-200 p-4">
            <p className="text-sm text-green-700">
              ✅ AI auto-reply is <strong>enabled</strong>. The AI will respond to messages outside business hours
              and handle common questions using your business context.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}