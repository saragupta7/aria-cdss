import { HeaderClock } from "./HeaderClock";
import { useEffect, useMemo, useState } from "react";
import { FileText, Search, Download, ShieldCheck, Activity, Users, AlertTriangle, Loader2 } from "lucide-react";
import { adminApi, type AuditLogEntry } from "../../api/admin";

const roleLabel: Record<string, string> = {
  admin: "Admin",
  senior: "Senior",
  junior: "Junior",
};

function humanizeAction(action: string) {
  return action
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function AuditTrail() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const data = await adminApi.getAuditLogs();
        setLogs(data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load audit logs");
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return logs;
    const q = query.toLowerCase();
    return logs.filter(
      (l) =>
        l.action?.toLowerCase().includes(q) ||
        l.user?.name?.toLowerCase().includes(q) ||
        l.resource?.toLowerCase().includes(q) ||
        String(l.resourceId || "").toLowerCase().includes(q)
    );
  }, [logs, query]);

  const stats = useMemo(() => {
    const isAlert = (a: string) => a.includes("ALERT");
    const isAuth = (a: string) => ["LOGIN", "REGISTER_USER", "CHANGE_PASSWORD"].includes(a);
    return {
      total: logs.length,
      alerts: logs.filter((l) => isAlert(l.action)).length,
      clinical: logs.filter((l) => !isAlert(l.action) && !isAuth(l.action)).length,
      auth: logs.filter((l) => isAuth(l.action)).length,
    };
  }, [logs]);

  const exportCsv = () => {
    const header = ["Timestamp", "User", "Role", "Action", "Resource", "Target", "IP"];
    const rows = filtered.map((l) => [
      new Date(l.timestamp).toISOString(),
      l.user?.name || "System",
      l.user?.role || "-",
      l.action,
      l.resource || "-",
      l.resourceId || "-",
      l.ipAddress || "-",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center min-h-screen items-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-50/50 min-h-screen flex items-center justify-center">
        <div className="bg-red-50 text-red-600 px-6 py-4 rounded-xl border border-red-100 font-medium flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50/50 min-h-screen p-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900 leading-tight">Audit Trail</h1>
              <p className="text-sm text-slate-500 font-medium">System access and action log</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-11 w-80 flex items-center px-4 focus-within:ring-2 focus-within:ring-[#3b82f6]">
              <Search className="w-4 h-4 text-slate-400 mr-3" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search logs, users, or IDs..."
                className="flex-1 bg-transparent outline-none text-sm text-slate-700"
              />
            </div>
            <button
              onClick={exportCsv}
              className="px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50 font-bold text-sm shadow-sm flex items-center gap-2 transition-all"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <HeaderClock />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <CompactStatCard title="Total Logs" value={stats.total} icon={FileText} colorClass="text-slate-800" bgClass="bg-slate-100" />
          <CompactStatCard title="Alert Events" value={stats.alerts} icon={AlertTriangle} colorClass="text-[#f59e0b]" bgClass="bg-[#f59e0b]/10" />
          <CompactStatCard title="Clinical Actions" value={stats.clinical} icon={Users} colorClass="text-[#3b82f6]" bgClass="bg-[#3b82f6]/10" />
          <CompactStatCard title="Auth Events" value={stats.auth} icon={Activity} colorClass="text-slate-500" bgClass="bg-slate-200/50" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Action Taken</th>
                <th className="px-6 py-4">Resource</th>
                <th className="px-6 py-4">Target Record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-500 font-medium whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">{log.user?.name || "System"}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                          !log.user ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {log.user ? roleLabel[log.user.role] || log.user.role : "System"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium">{humanizeAction(log.action)}</td>
                    <td className="px-6 py-4 text-slate-500">{log.resource || "-"}</td>
                    <td className="px-6 py-4 font-mono text-[#3b82f6] font-bold text-xs">{log.resourceId || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CompactStatCard({ title, value, icon: Icon, colorClass, bgClass }: any) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl ${bgClass} flex items-center justify-center shrink-0`}>
        <Icon className={`w-6 h-6 ${colorClass}`} />
      </div>
      <div>
        <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-0.5">{title}</p>
        <p className={`text-2xl font-bold ${colorClass} leading-none`}>{value}</p>
      </div>
    </div>
  );
}
