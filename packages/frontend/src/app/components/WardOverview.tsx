import { Link } from "react-router";
import { Building2, Users, AlertTriangle, Search, ChevronRight } from "lucide-react";
import { patients } from "../data/patients";

export function WardOverview() {
  const wards = ['A', 'B', 'C'];

  const getWardStats = (ward: string) => {
    const wardPatients = patients.filter(p => p.ward === ward);
    return {
      total: wardPatients.length,
      critical: wardPatients.filter(p => p.riskLevel === 'CRITICAL').length,
      moderate: wardPatients.filter(p => p.riskLevel === 'MODERATE').length,
      stable: wardPatients.filter(p => p.riskLevel === 'STABLE').length,
      patients: wardPatients,
    };
  };

  const totalPatients = patients.length;
  const totalCritical = patients.filter(p => p.riskLevel === 'CRITICAL').length;
  const totalModerate = patients.filter(p => p.riskLevel === 'MODERATE').length;
  const totalStable = patients.filter(p => p.riskLevel === 'STABLE').length;

  return (
    <div className="bg-slate-50/50 min-h-screen p-8">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Header & Search */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
              <Building2 className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">Ward Overview</h1>
              <p className="text-sm text-slate-500 font-medium">System-wide patient distribution</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-11 w-80 flex items-center px-4 transition-all focus-within:ring-2 focus-within:ring-blue-100">
            <Search className="w-4 h-4 text-slate-400 mr-3" />
            <input
              type="text"
              placeholder="Search wards or patients..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Compact System Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <CompactStatCard 
            title="Total Census" 
            value={totalPatients} 
            icon={Users} 
            colorClass="text-slate-800" 
            bgClass="bg-slate-100" 
          />
          <CompactStatCard 
            title="Stable" 
            value={totalStable} 
            icon={Building2} 
            colorClass="text-[#3b82f6]" 
            bgClass="bg-[#3b82f6]/10" 
          />
          <CompactStatCard 
            title="Moderate" 
            value={totalModerate} 
            icon={AlertTriangle} 
            colorClass="text-[#f59e0b]" 
            bgClass="bg-[#f59e0b]/10" 
          />
          <CompactStatCard 
            title="Critical" 
            value={totalCritical} 
            icon={AlertTriangle} 
            colorClass="text-[#e85d22]" 
            bgClass="bg-[#e85d22]/10" 
          />
        </div>

        {/* Ward Sections */}
        <div className="space-y-6">
          {wards.map((ward) => {
            const stats = getWardStats(ward);
            return (
              <div key={ward} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  
                  {/* Left Side: Ward Title */}
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                      {ward}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Ward {ward}</h2>
                      <p className="text-sm text-slate-500 font-medium">{stats.total} Active Patients</p>
                    </div>
                  </div>
                  
                  {/* Right Side: Stats Breakdown + View Ward Button */}
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                      <MiniStat label="STABLE" value={stats.stable} dotColor="bg-[#3b82f6]" />
                      <div className="w-px h-6 bg-slate-200"></div>
                      <MiniStat label="MOD" value={stats.moderate} dotColor="bg-[#f59e0b]" />
                      <div className="w-px h-6 bg-slate-200"></div>
                      <MiniStat label="CRIT" value={stats.critical} dotColor="bg-[#e85d22]" />
                    </div>

                    <Link
                      to={`/dashboard/ward/${ward}`}
                      className="flex items-center gap-2 px-5 py-2.5 border border-slate-300 bg-white text-slate-700 rounded-lg hover:bg-slate-800 hover:text-white hover:border-slate-800 transition-all text-sm font-bold shadow-sm"
                    >
                      View Ward
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white" />
                    </Link>
                  </div>
                  
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-5 gap-4">
                    {stats.patients.map((patient) => (
                      <Link
                        key={patient.id}
                        to={`/dashboard/patient/${patient.id}`}
                        className="bg-white rounded-xl p-4 border border-slate-200 transition-all hover:shadow-md hover:border-slate-400 flex flex-col justify-between group"
                      >
                        <div>
                          <div className="flex items-start justify-between mb-3">
                            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              patient.riskLevel === 'STABLE' ? 'bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20' :
                              patient.riskLevel === 'MODERATE' ? 'bg-[#f59e0b]/10 text-[#d97706] border border-[#f59e0b]/30' :
                              'bg-[#e85d22]/10 text-[#e85d22] border border-[#e85d22]/20'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-sm ${
                                patient.riskLevel === 'STABLE' ? 'bg-[#3b82f6]' :
                                patient.riskLevel === 'MODERATE' ? 'bg-[#f59e0b]' :
                                'bg-[#e85d22] animate-pulse'
                              }`}></span>
                              {patient.riskLevel}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">{patient.id}</span>
                          </div>
                          
                          <div className="text-slate-900 text-sm font-bold mb-1 group-hover:text-slate-600 transition-colors">{patient.name}</div>
                          <div className="text-slate-500 text-[11px] font-medium mb-3">
                            {patient.age}y, {patient.gender} • Bed {patient.bed}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {patient.vasopressor && (
                            <div className="bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#3b82f6] px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-center">
                              ⚡ Vasopressor
                            </div>
                          )}
                          {patient.predictedInstability && (
                            <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-[#d97706] px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-center">
                              ⚠ Instability: {patient.predictedInstability}
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Compact Stat Card
function CompactStatCard({ title, value, icon: Icon, colorClass, bgClass }: any) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center gap-4">
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

// Mini Stat for Ward Header
function MiniStat({ label, value, dotColor }: { label: string, value: number, dotColor: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${dotColor}`}></div>
      <span className="text-slate-900 font-bold">{value}</span>
      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </div>
  );
}