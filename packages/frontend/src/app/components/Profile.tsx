import { useState } from "react";
import { LogOut } from "lucide-react";
import {
  User,
  Shield,
  Bell,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  Building2,
} from "lucide-react";

export function Profile() {
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <div className="bg-slate-50/50 min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">
          User Settings
        </h1>

        {/* Profile Header */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 mb-6 overflow-hidden">
          <div className="p-8">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-slate-900 flex items-center justify-center text-white text-4xl font-bold">
                SG
              </div>

              <div>
                <h2 className="text-3xl font-bold text-slate-900">
                  Dr. Sarah Gupta
                </h2>

                <p className="text-lg text-slate-500 mt-1">
                  Senior ICU Clinician
                </p>

                <div className="flex gap-3 mt-4">
                  <span className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-700 text-sm font-medium">
                    Administrator
                  </span>

                  <span className="px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                    Active
                  </span>

                  <span className="px-4 py-1.5 rounded-full bg-orange-100 text-[#e85d22] text-sm font-medium">
                    Ward A Lead
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mt-8 pt-6 border-t border-slate-100">
              <InfoItem
                icon={Mail}
                label="Email"
                value="s.gupta@hospital.org"
              />

              <InfoItem
                icon={Phone}
                label="Phone"
                value="+1 (555) 123-4567"
              />

              <InfoItem
                icon={Building2}
                label="Department"
                value="Intensive Care Unit"
              />

              <InfoItem
                icon={Shield}
                label="Access Level"
                value="Administrator"
              />
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
            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="First Name"
                value="Sarah"
              />

              <InputField
                label="Last Name"
                value="Gupta"
              />
            </div>

            <InputField
              label="Email"
              value="s.gupta@hospital.org"
            />

            <InputField
              label="Phone"
              value="+1 (555) 123-4567"
            />

            <button className="mt-4 px-5 py-2 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800">
              Save Changes
            </button>
          </AccordionSection>

          <AccordionSection
            icon={Shield}
            title="Security & RBAC"
            open={openSection === "security"}
            onClick={() => toggleSection("security")}
          >
            <div className="space-y-5">
              <SettingRow
                label="Role"
                value="Administrator"
              />

              <SettingRow
                label="Department"
                value="ICU"
              />

              <SettingRow
                label="Ward Access"
                value="Ward A, Ward B"
              />

              <SettingRow
                label="Password"
                value="Last changed 45 days ago"
              />

              <button className="px-5 py-2 border border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50">
                Change Password
              </button>
            </div>
          </AccordionSection>

          <AccordionSection
            icon={Bell}
            title="Notification Preferences"
            open={openSection === "notifications"}
            onClick={() => toggleSection("notifications")}
          >
            <div className="space-y-4">
              <ToggleRow
                title="Critical Alerts"
                description="Immediate alerts for critical deterioration"
                enabled={true}
              />

              <ToggleRow
                title="MAP Alerts"
                description="Low blood pressure notifications"
                enabled={true}
              />

              <ToggleRow
                title="Daily Summary"
                description="Receive end-of-day reports"
                enabled={false}
              />

              <ToggleRow
                title="System Updates"
                description="Maintenance and platform updates"
                enabled={true}
              />
            </div>
          </AccordionSection>
        </div>

        <div className="mt-6">
          <button className="flex items-center gap-2 px-8 py-3 border border-slate-200 text-slate-600 rounded-xl font-medium hover:border-slate-300 hover:bg-slate-50 transition-all">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

function AccordionSection({
  icon: Icon,
  title,
  children,
  open,
  onClick,
}: any) {
  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        onClick={onClick}
        className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-slate-500" />
          <span className="font-semibold text-slate-900">
            {title}
          </span>
        </div>

        {open ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {open && (
        <div className="px-6 pb-6">
          {children}
        </div>
      )}
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: any) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-5 h-5 text-slate-400" />

      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <p className="font-medium text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-600 mb-2">
        {label}
      </label>

      <input
        defaultValue={value}
        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function SettingRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-500">
        {label}
      </span>

      <span className="font-medium text-slate-900">
        {value}
      </span>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  enabled,
}: {
  title: string;
  description: string;
  enabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
      <div>
        <p className="font-medium text-slate-900">
          {title}
        </p>

        <p className="text-sm text-slate-500">
          {description}
        </p>
      </div>

      <div
        className={`w-11 h-6 rounded-full relative ${
          enabled ? "bg-blue-500" : "bg-slate-300"
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
            enabled ? "right-1" : "left-1"
          }`}
        />
      </div>
    </div>
  );
}