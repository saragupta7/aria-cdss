import { FileText, Search, Download, ShieldCheck, Activity, Users, AlertTriangle } from "lucide-react";

export function AuditTrail() {
  const logs = [
    { id: 'LOG-001', time: '14:22:05', user: 'Dr. Sarah G.', action: 'Acknowledged Alert', target: 'PT-0042', role: 'Attending' },
    { id: 'LOG-002', time: '14:15:00', user: 'System AI', action: 'Generated Critical Risk Alert', target: 'PT-0042', role: 'System' },
    { id: 'LOG-003', time: '13:45:12', user: 'Nurse Michael R.', action: 'Updated Flowsheet', target: 'PT-0029', role: 'RN' },
    { id: 'LOG-004', time: '13:00:00', user: 'Admin System', action: 'Night Shift Data Sync', target: 'System-wide', role: 'Admin' },
  ];

  return (
    <div className="bg-slate-50/50 min-h-screen p-8">
      <div className="max-w-[1600px] mx-auto">
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">Audit Trail</h1>
              <p className="text-sm text-slate-500 font-medium">HIPAA compliant system access and action log</p>
            </div>
          </div>
          <div className="flex gap-3">
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-11 w-80 flex items-center px-4 focus-within:ring-2 focus-within:ring-[#3b82f6]">
              <Search className="w-4 h-4 text-slate-400 mr-3" />
              <input type="text" placeholder="Search logs or IDs..." className="flex-1 bg-transparent outline-none text-sm text-slate-700" />
             </div>
             <button className="px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50 font-bold text-sm shadow-sm flex items-center gap-2 transition-all">
               <Download className="w-4 h-4" /> Export CSV
             </button>
          </div>
        </div>

        {/* New Stat Row for Audit Trail */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <CompactStatCard title="Total Logs (24h)" value="1,248" icon={FileText} colorClass="text-slate-800" bgClass="bg-slate-100" />
          <CompactStatCard title="AI Alerts Logged" value="142" icon={AlertTriangle} colorClass="text-[#f59e0b]" bgClass="bg-[#f59e0b]/10" />
          <CompactStatCard title="Clinical Actions" value="894" icon={Users} colorClass="text-[#3b82f6]" bgClass="bg-[#3b82f6]/10" />
          <CompactStatCard title="System Events" value="212" icon={Activity} colorClass="text-slate-500" bgClass="bg-slate-200/50" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Log ID</th>
                <th className="px-6 py-4">User / System</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Action Taken</th>
                <th className="px-6 py-4">Target Record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-500 font-medium">{log.time}</td>
                  <td className="px-6 py-4 font-mono text-slate-400 text-xs">{log.id}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{log.user}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      log.role === 'System' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {log.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-700 font-medium">{log.action}</td>
                  <td className="px-6 py-4 font-mono text-[#3b82f6] font-bold text-xs">{log.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Reusable Compact Stat Card
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