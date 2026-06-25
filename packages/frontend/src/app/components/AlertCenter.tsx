import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Bell, Clock, CheckCircle2, AlertTriangle, Search, Loader2 } from "lucide-react";
import { alertsApi } from "../../api/alerts";
import type { Alert } from "@aria/shared";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function AlertCenter() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const data = await alertsApi.getAll();
      // data might be { count, alerts } or just array based on backend. Our api/alerts.ts says it expects an array or the backend returns { count, alerts }.
      // Checking the backend route: `res.json({ count: alerts.length, alerts });`.
      // So we should handle that in the API client or here.
      setAlerts((data as any).alerts || data || []);
    } catch (err) {
      setError("Failed to fetch alerts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleResolve = async (id: string) => {
    try {
      await alertsApi.resolve(id);
      fetchAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

  const activeAlerts = alerts.filter(a => a.status === 'active').length;
  const avgResponseTime = '4.2';
  const resolvedToday = alerts.filter(a => a.status === 'resolved').length;

  const chartData = [
    { hour: '00:00', alerts: 2 },
    { hour: '04:00', alerts: 1 },
    { hour: '08:00', alerts: 4 },
    { hour: '12:00', alerts: 3 },
    { hour: '16:00', alerts: 5 },
    { hour: '20:00', alerts: 2 },
    { hour: '24:00', alerts: 4 },
  ];

  return (
    <div className="bg-slate-50/50 min-h-screen p-8">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Header & Search */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
              <Bell className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">Alert Center</h1>
              <p className="text-sm text-slate-500 font-medium">Manage and acknowledge clinical warnings</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-11 w-80 flex items-center px-4 transition-all focus-within:ring-2 focus-within:ring-blue-100">
            <Search className="w-4 h-4 text-slate-400 mr-3" />
            <input
              type="text"
              placeholder="Search alert history..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Compact Stat Cards - Now a clean 3-column layout */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          <CompactStatCard 
            title="Active Alerts" 
            value={activeAlerts} 
            icon={AlertTriangle} 
            colorClass="text-[#e85d22]" 
            bgClass="bg-[#e85d22]/10" 
          />
          <CompactStatCard 
            title="Avg Response" 
            value={`${avgResponseTime}m`} 
            icon={Clock} 
            colorClass="text-[#f59e0b]" 
            bgClass="bg-[#f59e0b]/10" 
          />
          <CompactStatCard 
            title="Resolved Today" 
            value={resolvedToday} 
            icon={CheckCircle2} 
            colorClass="text-[#3b82f6]" 
            bgClass="bg-[#3b82f6]/10" 
          />
        </div>

        {/* Full-width Trend Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Alert Volume Trend (24h)</h2>
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span className="w-2 h-2 rounded-full bg-[#0f172a]"></span> System Alerts
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="hour" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }} 
                />
                <Tooltip 
                  cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }} 
                  contentStyle={{ borderRadius: '8px', fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="alerts" 
                  name="Alerts"
                  stroke="#0f172a" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#0f172a', strokeWidth: 0 }} 
                  activeDot={{ r: 6, fill: '#3b82f6', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alert Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-base font-bold text-slate-900">Active & Recent Alerts</h2>
            <div className="flex gap-2">
              <select className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 bg-white font-medium outline-none focus:ring-2 focus:ring-blue-100">
                <option>All Wards</option>
                <option>Ward A</option>
                <option>Ward B</option>
              </select>
              <select className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 bg-white font-medium outline-none focus:ring-2 focus:ring-blue-100">
                <option>Status: All</option>
                <option>Active</option>
                <option>Acknowledged</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-white text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold">Time</th>
                  <th className="px-6 py-4 font-bold">Patient</th>
                  <th className="px-6 py-4 font-bold">Severity</th>
                  <th className="px-6 py-4 font-bold">Alert Type</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alerts.map((alert) => (
                  <tr key={alert._id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 text-slate-500 text-sm font-medium">{new Date(alert.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-slate-900 font-bold">{alert.patient?.name || 'Unknown'}</span>
                        <span className="text-slate-500 text-xs font-medium">Bed {alert.patient?.icuBed} • {alert.patient?.patientId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        alert.severity === 'critical' ? 'bg-[#e85d22]/10 text-[#e85d22] border border-[#e85d22]/20' :
                        alert.severity === 'high' || alert.severity === 'medium' ? 'bg-[#f59e0b]/10 text-[#d97706] border border-[#f59e0b]/30' :
                        'bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20'
                      }`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-800 text-sm font-bold">{alert.type.replace('_', ' ')}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          alert.status === 'active' ? 'bg-[#e85d22] animate-pulse' :
                          alert.status === 'acknowledged' ? 'bg-[#f59e0b]' : 'bg-[#3b82f6]'
                        }`}></span>
                        <span className="text-slate-700 text-sm font-bold uppercase">{alert.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          to={`/dashboard/patient/${alert.patient?.patientId}`}
                          className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition-all"
                        >
                          View
                        </Link>
                        {alert.status === 'active' && (
                          <button onClick={() => handleResolve(alert._id)} className="px-3 py-1.5 bg-[#f59e0b] text-white rounded-lg text-xs font-bold hover:bg-[#d97706] transition-all shadow-sm">
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact Stat Card
function CompactStatCard({ title, value, icon: Icon, colorClass, bgClass }: any) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 transition-all hover:shadow-md flex items-center justify-between">
      <div>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
        <p className={`text-4xl font-bold ${colorClass} leading-none`}>{value}</p>
      </div>
      <div className={`w-14 h-14 rounded-full ${bgClass} flex items-center justify-center shrink-0`}>
        <Icon className={`w-7 h-7 ${colorClass}`} />
      </div>
    </div>
  );
}