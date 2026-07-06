import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  BarChart3,
  AlertTriangle,
  Users,
  Activity,
  Clock,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { patientsApi } from "../../api/patients";
import { alertsApi } from "../../api/alerts";
import type { Patient, Alert } from "@aria/shared";

const COLORS = {
  primary: "#3B82F6",
  warning: "#F59E0B",
  critical: "#EA5B1F",
  navy: "#0F2F56",
};

export function AdminAnalytics() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [p, a] = await Promise.all([patientsApi.getAll(), alertsApi.getAudit()]);
        setPatients(p);
        setAlerts(a);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Derived metrics (all from real data) ──────────────────────────────
  const riskData = useMemo(() => {
    const buckets = Array.from({ length: 10 }, (_, i) => ({
      name: `${i * 10}-${i * 10 + 10}%`,
      count: 0,
    }));
    patients.forEach((p) => {
      const pct = Math.min(99, Math.max(0, Math.round((p.riskScore || 0) * 100)));
      buckets[Math.min(9, Math.floor(pct / 10))].count += 1;
    });
    return buckets;
  }, [patients]);

  const alertStatus = useMemo(() => {
    const total = alerts.length || 1;
    const count = (s: string) => alerts.filter((a) => a.status === s).length;
    return [
      { name: "Resolved", value: Math.round((count("resolved") / total) * 100), raw: count("resolved"), color: COLORS.primary },
      { name: "Acknowledged", value: Math.round((count("acknowledged") / total) * 100), raw: count("acknowledged"), color: COLORS.warning },
      { name: "Active", value: Math.round((count("active") / total) * 100), raw: count("active"), color: COLORS.critical },
    ];
  }, [alerts]);

  const responseData = useMemo(() => {
    const groups: Record<string, number[]> = { admin: [], senior: [], junior: [] };
    alerts.forEach((a) => {
      if (a.acknowledgedAt && a.acknowledgedBy?.role) {
        const mins = (new Date(a.acknowledgedAt).getTime() - new Date(a.createdAt).getTime()) / 60000;
        if (mins >= 0 && groups[a.acknowledgedBy.role]) groups[a.acknowledgedBy.role].push(mins);
      }
    });
    const labels: Record<string, string> = { admin: "Admin", senior: "Senior Clinician", junior: "Junior Clinician" };
    return Object.entries(groups)
      .filter(([, arr]) => arr.length > 0)
      .map(([role, arr]) => ({
        role: labels[role],
        time: Number((arr.reduce((s, x) => s + x, 0) / arr.length).toFixed(1)),
      }));
  }, [alerts]);

  const wardCensus = useMemo(() => {
    const map: Record<string, number> = {};
    patients.forEach((p) => {
      map[p.ward] = (map[p.ward] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ward, count]) => ({ ward: `Ward ${ward}`, count }));
  }, [patients]);

  const kpis = useMemo(() => {
    const ackMins = alerts
      .filter((a) => a.acknowledgedAt)
      .map((a) => (new Date(a.acknowledgedAt as string).getTime() - new Date(a.createdAt).getTime()) / 60000)
      .filter((m) => m >= 0);
    const avgAck = ackMins.length ? (ackMins.reduce((s, x) => s + x, 0) / ackMins.length).toFixed(1) : "—";
    const resolved = alerts.filter((a) => a.status === "resolved").length;
    const critical = patients.filter((p) => p.riskLevel === "critical" || p.riskLevel === "high").length;
    return {
      totalAlerts: alerts.length,
      activeAlerts: alerts.filter((a) => a.status === "active").length,
      avgAck: avgAck === "—" ? "—" : `${avgAck} min`,
      resolutionRate: alerts.length ? `${Math.round((resolved / alerts.length) * 100)}%` : "—",
      totalPatients: patients.length,
      criticalPatients: critical,
    };
  }, [alerts, patients]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center min-h-screen items-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="bg-red-50 text-red-600 px-6 py-4 rounded-xl border border-red-100 font-medium flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" /> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen p-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
            <BarChart3 className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
            <p className="text-sm text-slate-500">Operational metrics across the ICU</p>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-6 gap-4 mb-8">
          <StatCard title="Total Patients" value={String(kpis.totalPatients)} icon={Users} />
          <StatCard title="Critical / High" value={String(kpis.criticalPatients)} icon={AlertTriangle} />
          <StatCard title="Total Alerts" value={String(kpis.totalAlerts)} icon={Activity} />
          <StatCard title="Active Alerts" value={String(kpis.activeAlerts)} icon={AlertTriangle} />
          <StatCard title="Avg ACK Time" value={kpis.avgAck} icon={Clock} />
          <StatCard title="Resolution Rate" value={kpis.resolutionRate} icon={CheckCircle2} />
        </div>

        {/* TOP ROW */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <Card title="Risk Score Distribution">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill={COLORS.primary} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Alert Status">
            {alerts.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-slate-400 font-medium">No alerts recorded yet</div>
            ) : (
              <>
                <div className="h-72 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={alertStatus} dataKey="raw" innerRadius={70} outerRadius={100} paddingAngle={4}>
                        {alertStatus.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-2 text-sm font-medium">
                  {alertStatus.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name} {item.raw} ({item.value}%)
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>

        {/* SECOND ROW */}
        <div className="grid grid-cols-2 gap-6">
          <Card title="Avg Response Time by Role (min)">
            {responseData.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-slate-400 font-medium">
                No acknowledged alerts yet
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={responseData}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="role" width={110} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="time" fill={COLORS.navy} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card title="Ward Census">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wardCensus}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="ward" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill={COLORS.warning} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md">
      <h2 className="text-lg font-bold text-slate-900 mb-6">{title}</h2>
      {children}
    </div>
  );
}

function StatCard({ title, value, icon: Icon }: { title: string; value: string; icon: any }) {
  return (
    <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-md">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        <Icon className="w-5 h-5 text-slate-500" />
      </div>
    </div>
  );
}
