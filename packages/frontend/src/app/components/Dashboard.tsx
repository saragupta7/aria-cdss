import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Search, Activity, AlertCircle, Droplet } from "lucide-react";
import { patientsApi } from "../../api/patients";
import { alertsApi } from "../../api/alerts";
import type { Patient, Alert } from "@aria/shared";
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
  ResponsiveContainer
} from "recharts";

const riskLevelMap: Record<string, string> = { low: 'STABLE', medium: 'MODERATE', high: 'CRITICAL', critical: 'CRITICAL' };

interface DashboardPatient extends Patient {
  displayRiskLevel: string;
  bed: string;
}

export function Dashboard() {
  const [patients, setPatients] = useState<DashboardPatient[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [data, alertData] = await Promise.all([
          patientsApi.getAll(),
          alertsApi.getAudit(),
        ]);

        const mapped: DashboardPatient[] = data.map((p: Patient) => {
          return {
            ...p,
            bed: p.icuBed ? p.icuBed.replace(/^[A-Z]/i, '') : '1',
            displayRiskLevel: riskLevelMap[p.riskLevel || 'low'] || 'STABLE',
          };
        });
        setPatients(mapped);
        setAlerts(alertData);
      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="min-h-screen p-8 bg-slate-50/50 flex items-center justify-center font-medium text-slate-500">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="min-h-screen p-8 bg-slate-50/50 flex items-center justify-center font-medium text-red-500">{error}</div>;
  }

  const q = search.trim().toLowerCase();
  const matchesSearch = (p: DashboardPatient) =>
    !q ||
    p.name.toLowerCase().includes(q) ||
    (p.patientId || "").toLowerCase().includes(q) ||
    (p.icuBed || "").toLowerCase().includes(q) ||
    (p.diagnosis || "").toLowerCase().includes(q) ||
    (p.displayRiskLevel || "").toLowerCase().includes(q);

  const visiblePatients = patients.filter(matchesSearch);
  const wardA = visiblePatients.filter(p => p.ward === 'A');
  const wardB = visiblePatients.filter(p => p.ward === 'B');
  const wardC = visiblePatients.filter(p => p.ward === 'C');

  const criticalCount = patients.filter(p => p.displayRiskLevel === 'CRITICAL').length;
  const stableCount = patients.filter(p => p.displayRiskLevel === 'STABLE').length;
  const moderateCount = patients.filter(p => p.displayRiskLevel === 'MODERATE').length;
  const totalPatients = patients.length;
  const activeMapAlerts = alerts.filter(a => a.status === 'active').length;

  // Updated Palette
  const COLORS = {
    stable: '#3b82f6',   // Clinical Blue
    moderate: '#f59e0b', // Warning Amber
    critical: '#e85d22'  // Critical Orange
  };

  // Data for the Donut Chart
  const acuityData = [
    { name: 'Stable', value: stableCount, color: COLORS.stable },
    { name: 'Moderate', value: moderateCount, color: COLORS.moderate },
    { name: 'Critical', value: criticalCount, color: COLORS.critical },
  ];

  // Alert volume over the last 12 hours, bucketed by hour (from real alerts)
  const now = new Date();
  const alertTrendData = Array.from({ length: 12 }, (_, i) => {
    const slot = new Date(now.getTime() - (11 - i) * 3600 * 1000);
    const label = `${slot.getHours().toString().padStart(2, '0')}:00`;
    const generated = alerts.filter(a => {
      const t = new Date(a.createdAt);
      return t.getFullYear() === slot.getFullYear() &&
        t.getMonth() === slot.getMonth() &&
        t.getDate() === slot.getDate() &&
        t.getHours() === slot.getHours();
    }).length;
    return { time: label, generated };
  });

  // Recent activity derived from the latest alerts
  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff < 1) return 'just now';
    if (diff < 60) return `${diff}m ago`;
    const hrs = Math.floor(diff / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };
  const severityToType = (s: string) => (s === 'critical' ? 'critical' : s === 'low' ? 'stable' : 'moderate');
  const recentEvents = alerts.slice(0, 5).map(a => ({
    time: timeAgo(a.createdAt),
    action: a.status === 'resolved' ? 'Alert resolved' : a.status === 'acknowledged' ? 'Alert acknowledged' : (a.type || 'alert').replace(/_/g, ' '),
    patient: a.patient?.patientId || a.patient?.name || '—',
    type: severityToType(a.severity),
  }));

  return (
    <div className="min-h-screen p-8 max-w-[1600px] mx-auto bg-slate-50/50">
      {/* Header & Search */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Dashboard</h1>
          <p className="text-sm text-slate-500 font-medium">Real-time patient monitoring overview</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-12 w-96 flex items-center px-4 transition-all focus-within:ring-2 focus-within:ring-blue-100">
            <Search className="w-5 h-5 text-slate-400 mr-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patients by name, ID, bed, or diagnosis..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Top Row: Clean, Minimalist Highlight Cards */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <HighlightCard 
          title="Critical Risk" 
          value={criticalCount} 
          subtitle="Active Patients" 
          icon={Droplet} 
          accentColor="text-[#e85d22]" 
          bgAccent="bg-[#e85d22]/10" 
        />
        <HighlightCard
          title="Active Alerts"
          value={activeMapAlerts}
          subtitle="Requires Attention"
          icon={AlertCircle} 
          accentColor="text-[#f59e0b]" 
          bgAccent="bg-[#f59e0b]/10" 
        />
        <HighlightCard 
          title="Moderate Risk" 
          value={moderateCount} 
          subtitle="Patients Monitored" 
          icon={Activity} 
          accentColor="text-[#3b82f6]" 
          bgAccent="bg-[#3b82f6]/10" 
        />
      </div>

      {/* Second Row: High-Density Data Visualizations */}
      <div className="grid grid-cols-12 gap-6 mb-10">
        
        {/* Graph 1: Acuity Breakdown */}
        <div className="col-span-4 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Acuity Distribution</h2>
          <div className="flex items-center justify-between gap-4">
            <div className="w-[140px] h-[140px] relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={acuityData}
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {acuityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold text-slate-800">{totalPatients}</span>
              </div>
            </div>
            
            <div className="flex-1 space-y-3">
              {acuityData.map((item) => (
                <div key={item.name} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                      <span className="text-slate-600 uppercase tracking-wider">{item.name}</span>
                    </div>
                    <span className="text-slate-900">{item.value} <span className="text-slate-400 font-medium">({Math.round((item.value / totalPatients) * 100)}%)</span></span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(item.value / totalPatients) * 100}%`, backgroundColor: item.color }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Graph 2: Alert Volume Histogram */}
        <div className="col-span-5 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Alert Volume (12h)</h2>
            <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {/* Legend updated to Clinical Blue */}
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#3b82f6] rounded-sm"></span> Generated</span>
            </div>
          </div>
          <div className="flex-1 min-h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              {/* barCategoryGap keeps bars close, but more data points makes them thinner natively */}
              <BarChart data={alertTrendData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }} barCategoryGap={2}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                  dy={10} 
                  interval={1} // Only show every other label so they don't overlap
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                />
                {/* Changed fill to Clinical Blue and added a maxBarSize just in case */}
                <Bar dataKey="generated" name="Alerts Generated" fill="#3b82f6" radius={[2, 2, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Clinical Activity Feed */}
        <div className="col-span-3 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Activity</h2>
          <div className="flex-1 flex flex-col justify-between">
            {recentEvents.length === 0 && (
              <p className="text-sm text-slate-400 font-medium">No recent activity</p>
            )}
            {recentEvents.map((event, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${
                    event.type === 'critical' ? 'bg-[#e85d22]' : 
                    event.type === 'moderate' ? 'bg-[#f59e0b]' : 'bg-[#3b82f6]'
                  }`}></div>
                  {i !== recentEvents.length - 1 && <div className="w-px h-full bg-slate-100 my-1"></div>}
                </div>
                <div className="pb-3">
                  <p className="text-sm font-bold text-slate-800 leading-tight">{event.action}</p>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    <span className="text-slate-700">{event.patient}</span> • {event.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Ward Overview Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Ward Operations</h2>
          <Link
            to="/dashboard/wards"
            className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-all text-sm font-bold shadow-sm"
          >
            View All Wards
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <WardCard ward="A" patients={wardA} />
          <WardCard ward="B" patients={wardB} />
          <WardCard ward="C" patients={wardC} />
        </div>
      </div>
    </div>
  );
}

// Minimalist Highlight Card
function HighlightCard({ title, value, subtitle, icon: Icon, accentColor, bgAccent }: any) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 transition-all hover:shadow-md flex items-center justify-between">
      <div>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
        <div className="flex items-baseline gap-2">
          <p className={`text-4xl font-bold ${accentColor}`}>{value}</p>
        </div>
        <p className="text-slate-400 text-sm font-medium mt-1">{subtitle}</p>
      </div>
      <div className={`w-14 h-14 rounded-full ${bgAccent} flex items-center justify-center`}>
        <Icon className={`w-7 h-7 ${accentColor}`} />
      </div>
    </div>
  );
}

// Refined Ward Card
function WardCard({ ward, patients }: { ward: string; patients: DashboardPatient[] }) {
  const criticalCount = patients.filter(p => p.displayRiskLevel === 'CRITICAL').length;
  const moderateCount = patients.filter(p => p.displayRiskLevel === 'MODERATE').length;
  const stableCount = patients.filter(p => p.displayRiskLevel === 'STABLE').length;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 transition-all hover:border-slate-300">
      <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-xl shadow-sm">
            {ward}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Ward {ward}</h3>
            <p className="text-sm text-slate-500 font-medium">{patients.length} active patients</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-6">
            <StatColumn label="Stable" value={stableCount} dotColor="bg-[#3b82f6]" textColor="text-[#3b82f6]" />
            <div className="w-px h-8 bg-slate-200"></div>
            <StatColumn label="Moderate" value={moderateCount} dotColor="bg-[#f59e0b]" textColor="text-[#f59e0b]" />
            <div className="w-px h-8 bg-slate-200"></div>
            <StatColumn label="Critical" value={criticalCount} dotColor="bg-[#e85d22]" textColor="text-[#e85d22]" />
          </div>

          <Link
            to={`/dashboard/ward/${ward}`}
            className="px-5 py-2.5 border border-slate-300 bg-white text-slate-700 rounded-lg hover:bg-slate-800 hover:text-white transition-all text-sm font-bold shadow-sm"
          >
            Manage Ward
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {patients.map((patient) => (
          <Link
            key={patient.patientId}
            to={`/dashboard/patient/${patient.patientId}`}
            className="bg-slate-50/50 rounded-xl p-4 border border-slate-200 transition-all hover:shadow-md hover:border-slate-300 group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                patient.displayRiskLevel === 'STABLE' ? 'bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20' :
                patient.displayRiskLevel === 'MODERATE' ? 'bg-[#f59e0b]/10 text-[#d97706] border border-[#f59e0b]/30' :
                'bg-[#e85d22]/10 text-[#e85d22] border border-[#e85d22]/20'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-sm ${
                  patient.displayRiskLevel === 'STABLE' ? 'bg-[#3b82f6]' :
                  patient.displayRiskLevel === 'MODERATE' ? 'bg-[#f59e0b]' :
                  'bg-[#e85d22] animate-pulse'
                }`}></span>
                {patient.displayRiskLevel}
              </div>
              <span className="text-[10px] font-bold text-slate-400">{patient.patientId}</span>
            </div>
            
            <div className="text-slate-900 text-sm font-bold mb-1 group-hover:text-slate-600 transition-colors">
              {patient.name}
            </div>
            <div className="text-slate-500 text-xs font-medium">
              {patient.age}y, {patient.gender || 'Unknown'} • Bed {patient.bed}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatColumn({ label, value, dotColor, textColor }: { label: string, value: number, dotColor: string, textColor: string }) {
  return (
    <div className="text-center min-w-[60px]">
      <p className={`text-xl font-bold ${textColor} leading-none mb-1`}>{value}</p>
      <div className="flex items-center justify-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-sm ${dotColor}`}></div>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}