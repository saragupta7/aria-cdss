import { useEffect, useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import {
  User,
  Shield,
  ChevronDown,
  ChevronUp,
  Mail,
  Building2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../../api/auth";

const roleLabel: Record<string, string> = {
  admin: "Administrator",
  senior: "Senior ICU Clinician",
  junior: "Junior ICU Clinician",
};

export function Profile() {
  const { user, loading, logout, updateUser } = useAuth();
  const [openSection, setOpenSection] = useState<string | null>("profile");

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  if (loading || !user) {
    return (
      <div className="p-8 flex justify-center min-h-screen items-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="bg-slate-50/50 min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">User Settings</h1>

        {/* Profile Header */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 mb-6 overflow-hidden">
          <div className="p-8">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-slate-900 flex items-center justify-center text-white text-4xl font-bold">
                {initials}
              </div>

              <div>
                <h2 className="text-3xl font-bold text-slate-900">{user.name}</h2>
                <p className="text-lg text-slate-500 mt-1">{roleLabel[user.role] || user.role}</p>

                <div className="flex gap-3 mt-4">
                  <span className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-700 text-sm font-medium capitalize">
                    {roleLabel[user.role] || user.role}
                  </span>
                  <span className="px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                    Active
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mt-8 pt-6 border-t border-slate-100">
              <InfoItem icon={Mail} label="Email" value={user.email} />
              <InfoItem icon={Building2} label="Department" value="Intensive Care Unit" />
              <InfoItem icon={Shield} label="Access Level" value={roleLabel[user.role] || user.role} />
              <InfoItem icon={User} label="User ID" value={user.id} />
            </div>
          </div>
        </div>

        {/* Settings Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <AccordionSection
            icon={User}
            title="Edit Profile"
            open={openSection === "profile"}
            onClick={() => toggleSection("profile")}
          >
            <EditProfileForm user={user} onSaved={updateUser} />
          </AccordionSection>

          <AccordionSection
            icon={Shield}
            title="Security"
            open={openSection === "security"}
            onClick={() => toggleSection("security")}
          >
            <ChangePasswordForm />
          </AccordionSection>
        </div>

        <div className="mt-6">
          <button
            onClick={logout}
            className="flex items-center gap-2 px-8 py-3 border border-slate-200 text-slate-600 rounded-xl font-medium hover:border-slate-300 hover:bg-slate-50 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

function EditProfileForm({ user, onSaved }: { user: any; onSaved: (u: any) => void }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await authApi.updateProfile({ name, email });
      onSaved({ id: updated.id, name: updated.name, email: updated.email, role: updated.role });
      setMessage({ type: "ok", text: "Profile updated successfully" });
    } catch (err: any) {
      setMessage({ type: "err", text: err.response?.data?.message || "Failed to update profile" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <InputField label="Full Name" value={name} onChange={setName} />
      <InputField label="Email" value={email} onChange={setEmail} type="email" />

      {message && (
        <p className={`text-sm font-medium mb-3 ${message.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>
          {message.text}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-2 px-5 py-2 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        Save Changes
      </button>
    </div>
  );
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const handleChange = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setMessage({ type: "ok", text: "Password updated successfully" });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      setMessage({ type: "err", text: err.response?.data?.message || "Failed to change password" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-1">
      <InputField label="Current Password" value={currentPassword} onChange={setCurrentPassword} type="password" />
      <InputField label="New Password" value={newPassword} onChange={setNewPassword} type="password" />

      {message && (
        <p className={`text-sm font-medium mb-3 ${message.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>
          {message.text}
        </p>
      )}

      <button
        onClick={handleChange}
        disabled={saving || !currentPassword || !newPassword}
        className="mt-2 px-5 py-2 border border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        Change Password
      </button>
    </div>
  );
}

function AccordionSection({ icon: Icon, title, children, open, onClick }: any) {
  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        onClick={onClick}
        className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-slate-500" />
          <span className="font-semibold text-slate-900">{title}</span>
        </div>

        {open ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {open && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-5 h-5 text-slate-400" />
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
        <p className="font-medium text-slate-900 break-all">{value}</p>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-600 mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
