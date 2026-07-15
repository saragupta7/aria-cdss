import { Link } from "react-router";
import { Activity, Mail, Lock, Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { authApi } from "../../api/auth";

/* ============================================================
   ARIA change password — reached from the login page.
   Verifies email + current password, then sets the new one.
   Styled to match the Login form panel.
   ============================================================ */

const inputClass =
  "w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 disabled:opacity-50";

function Field({
  id,
  label,
  icon: Icon,
  ...inputProps
}: {
  id: string;
  label: string;
  icon: typeof Mail;
} & React.ComponentProps<"input">) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700 mb-2">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input id={id} className={inputClass} required {...inputProps} />
      </div>
    </div>
  );
}

export function ChangePassword() {
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    setIsLoading(true);
    try {
      await authApi.changePasswordPreLogin(email, currentPassword, newPassword);
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6 py-16 font-body">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-display text-lg font-bold text-slate-900">ARIA</span>
        </div>

        <h2 className="font-display text-3xl font-bold text-slate-900 mb-2">Change password</h2>

        {done ? (
          <div className="mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-emerald-800">
              Password updated successfully.{" "}
              <Link to="/login" className="font-semibold text-emerald-900 underline">
                Sign in
              </Link>{" "}
              with your new password.
            </p>
          </div>
        ) : (
          <>
            <p className="text-slate-500 font-medium mb-8">
              Verify your current credentials and choose a new password. If you can't remember
              your current password, ask an administrator to reset your account.
            </p>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Field
                id="email"
                label="Email address"
                icon={Mail}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                placeholder="you@hospital.org"
              />
              <Field
                id="current-password"
                label="Current password"
                icon={Lock}
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={isLoading}
                placeholder="Enter your current password"
              />
              <Field
                id="new-password"
                label="New password"
                icon={Lock}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
                placeholder="At least 6 characters"
                minLength={6}
              />
              <Field
                id="confirm-password"
                label="Confirm new password"
                icon={Lock}
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={isLoading}
                placeholder="Re-enter your new password"
                minLength={6}
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-500 hover:bg-blue-400 text-white py-3.5 rounded-xl font-bold tracking-wide transition-all shadow-lg shadow-blue-500/20 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Updating…
                  </>
                ) : (
                  "Update password"
                )}
              </button>
            </form>
          </>
        )}

        <div className="mt-8 flex items-center justify-center text-sm">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
