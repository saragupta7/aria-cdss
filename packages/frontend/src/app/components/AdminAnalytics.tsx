import { HeaderClock } from "./HeaderClock";
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
  LabelList,
} from "recharts";
import { CHART, AXIS_TICK, DarkTooltip, StatTile, ChartCard, LegendChip } from "./ChartKit";
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

// Chart marks use the validated ChartKit palette.
const COLORS = {
  primary: CHART.blue,
  warning: CHART.amber,
  critical: CHART.orange,
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
      .sort(([, a], [, b]) => b - a)
      .map(([ward, count]) => ({ ward, count }));
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
              <BarChart3 className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900">Analytics</h1>
              <p className="text-sm text-slate-500">Operational metrics across the ICU</p>
            </div>
          </div>
          <HeaderClock />
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-6 gap-4 mb-8">
          <StatTile label="Total Patients" value={kpis.totalPatients} icon={Users} />
          <StatTile label="Critical / High" value={kpis.criticalPatients} icon={AlertTriangle} accent={CHART.orange} valueColor={kpis.criticalPatients > 0 ? CHART.orange : undefined} />
          <StatTile label="Total Alerts" value={kpis.totalAlerts} icon={Activity} />
          <StatTile label="Active Alerts" value={kpis.activeAlerts} icon={AlertTriangle} accent={CHART.amber} />
          <StatTile label="Avg ACK Time" value={kpis.avgAck} icon={Clock} />
          <StatTile label="Resolution Rate" value={kpis.resolutionRate} icon={CheckCircle2} />
        </div>

        {/* TOP ROW */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <ChartCard
            title="Risk Score Distribution"
            right={
              <div className="flex items-center gap-4">
                <LegendChip color={CHART.blue}>&lt; 70%</LegendChip>
                <LegendChip color={CHART.orange}>critical zone</LegendChip>
              </div>
            }
          >
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskData} margin={{ top: 10, right: 0, left: -28, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={8} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    tick={AXIS_TICK}
                    domain={[0, (dataMax: number) => Math.max(5, Math.ceil(dataMax / 10) * 10)]}
                    tickCount={5}
                  />
                  <Tooltip cursor={{ fill: "#f8fafc" }} content={<DarkTooltip />} />
                  <Bar dataKey="count" name="Patients" radius={[4, 4, 0, 0]} maxBarSize={24}>
                    {riskData.map((bucket, i) => (
                      <Cell key={i} fill={i >= 7 ? CHART.orange : CHART.blue} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Alert Status">
            {alerts.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-slate-400 font-medium">No alerts recorded yet</div>
            ) : (
              <>
                <div className="h-64 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={alertStatus} dataKey="raw" nameKey="name" innerRadius={82} outerRadius={100} paddingAngle={2} stroke="#ffffff" strokeWidth={2}>
                        {alertStatus.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<DarkTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="font-display text-3xl font-bold text-slate-900 leading-none">{alerts.length}</span>
                    <span className="font-tele text-[9px] tracking-widest text-slate-400 uppercase mt-1">total alerts</span>
                  </div>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  {alertStatus.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs font-bold text-slate-600">{item.name}</span>
                      <span className="font-tele text-xs text-slate-900 font-bold">{item.raw}</span>
                      <span className="font-tele text-[10px] text-slate-400">({item.value}%)</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </ChartCard>
        </div>

        {/* SECOND ROW */}
        <div className="grid grid-cols-2 gap-6">
          <ChartCard title="Avg Response Time by Role (min)">
            {responseData.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-slate-400 font-medium">
                No acknowledged alerts yet
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={responseData} margin={{ top: 4, right: 44, left: 8, bottom: 0 }}>
                    <CartesianGrid horizontal={false} stroke={CHART.grid} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={AXIS_TICK} />
                    <YAxis type="category" dataKey="role" width={110} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }} />
                    <Tooltip cursor={{ fill: "#f8fafc" }} content={<DarkTooltip />} />
                    <Bar dataKey="time" name="Minutes" fill={CHART.blue} radius={[0, 4, 4, 0]} maxBarSize={20}>
                      <LabelList dataKey="time" position="right" style={{ fill: "#64748b", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>

          <ChartCard title="Ward Census">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={wardCensus} margin={{ top: 4, right: 36, left: 8, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke={CHART.grid} />
                  <XAxis type="number" axisLine={false} tickLine={false} allowDecimals={false} tick={AXIS_TICK} />
                  <YAxis type="category" dataKey="ward" width={96} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }} />
                  <Tooltip cursor={{ fill: "#f8fafc" }} content={<DarkTooltip />} />
                  <Bar dataKey="count" name="Patients" fill={CHART.blue} radius={[0, 4, 4, 0]} maxBarSize={20}>
                    <LabelList dataKey="count" position="right" style={{ fill: "#64748b", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

