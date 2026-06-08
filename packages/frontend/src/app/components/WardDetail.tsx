import { useParams, Link } from "react-router";
import { ArrowLeft, Users, AlertTriangle, Building2, Search } from "lucide-react";
import { patients } from "../data/patients";

export function WardDetail() {
  const { wardId } = useParams<{ wardId: string }>();
  const wardPatients = patients.filter(p => p.ward === wardId);

  const criticalCount = wardPatients.filter(p => p.riskLevel === 'CRITICAL').length;
  const moderateCount = wardPatients.filter(p => p.riskLevel === 'MODERATE').length;
  const stableCount = wardPatients.filter(p => p.riskLevel === 'STABLE').length;

  return (
    <div className="bg-slate-50/50 min-h-screen p-8 pb-12">
      <div className="max-w-[1400px] mx-auto">
        
        {/* FIXED: Now routes back to the Ward Overview page */}
        <Link to="/dashboard/wards" className="inline-flex items-center gap-2 text-slate-500 font-bold mb-6 hover:text-[#3b82f6] transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Ward Overview
        </Link>


        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-2xl shadow-sm">
              {wardId}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 leading-tight">Ward {wardId}</h1>
              <p className="text-sm text-slate-500 font-medium">{wardPatients.length} active patients</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-11 w-80 flex items-center px-4 transition-all focus-within:ring-2 focus-within:ring-blue-100">
            <Search className="w-4 h-4 text-slate-400 mr-3" />
            <input type="text" placeholder={`Search Ward ${wardId}...`} className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <CompactStatCard title="Total Patients" value={wardPatients.length} colorClass="text-slate-800" />
          <CompactStatCard title="Stable" value={stableCount} colorClass="text-[#3b82f6]" />
          <CompactStatCard title="Moderate" value={moderateCount} colorClass="text-[#f59e0b]" />
          <CompactStatCard title="Critical" value={criticalCount} colorClass="text-[#e85d22]" />
        </div>

        {/* Dense Patient Cards Grid (Matching your Image) */}
        <div className="grid grid-cols-3 gap-6">
          {wardPatients.map((patient) => (
            <Link key={patient.id} to={`/dashboard/patient/${patient.id}`} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 hover:shadow-md hover:border-[#3b82f6]/50 transition-all flex flex-col group">
              
              {/* Header: Avatar & Name */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex gap-4 items-center">
                  <div className="w-14 h-14 rounded-full bg-[#0f172a] text-white flex items-center justify-center text-lg font-bold shadow-sm">
                    {patient.name.split(' ')[0][0]}{patient.name.split(' ')[1]?.[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg leading-tight group-hover:text-[#3b82f6] transition-colors">{patient.name}</h3>
                    <p className="text-slate-500 text-xs font-medium">{patient.id}</p>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                  patient.riskLevel === 'STABLE' ? 'bg-[#3b82f6]/10 text-[#3b82f6]' :
                  patient.riskLevel === 'MODERATE' ? 'bg-[#f59e0b]/10 text-[#d97706]' :
                  'bg-[#e85d22]/10 text-[#e85d22]'
                }`}>
                  {patient.riskLevel}
                </div>
              </div>

              {/* Demographics Grid */}
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 mb-6 border-b border-slate-100 pb-6">
                <div>
                  <p className="text-[11px] text-slate-500 font-medium mb-0.5">Age / Gender</p>
                  <p className="font-bold text-slate-900 text-sm">{patient.age}y, {patient.gender}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 font-medium mb-0.5">Bed</p>
                  <p className="font-bold text-slate-900 text-sm">{patient.bed}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 font-medium mb-0.5">ICU Day</p>
                  <p className="font-bold text-slate-900 text-sm">Day {patient.icuDay}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 font-medium mb-0.5">Risk Score</p>
                  <p className={`font-bold text-sm ${
                    patient.riskLevel === 'STABLE' ? 'text-[#3b82f6]' : patient.riskLevel === 'MODERATE' ? 'text-[#f59e0b]' : 'text-[#e85d22]'
                  }`}>{patient.riskScore}%</p>
                </div>
              </div>

              {/* Vitals Summary */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                <div>
                  <p className="text-[11px] text-slate-500 font-medium mb-0.5">MAP</p>
                  <p className="font-bold text-slate-900 text-sm">{patient.vitals.map}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 font-medium mb-0.5">HR</p>
                  <p className="font-bold text-slate-900 text-sm">{patient.vitals.heartRate}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 font-medium mb-0.5">SpO2</p>
                  <p className="font-bold text-slate-900 text-sm">{patient.vitals.spO2}%</p>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="mt-auto space-y-2">
                {patient.vasopressor && (
                  <div className="w-full text-center py-2.5 bg-[#3b82f6]/10 text-[#3b82f6] text-xs font-bold rounded-lg border border-[#3b82f6]/20">
                    Vasopressor Active
                  </div>
                )}
                {patient.predictedInstability && (
                  <div className="w-full text-center py-2.5 bg-[#f59e0b]/10 text-[#d97706] text-xs font-bold rounded-lg border border-[#f59e0b]/20">
                    Instability in {patient.predictedInstability}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// Clean text-only stat card for the Ward Header
function CompactStatCard({ title, value, colorClass }: any) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">{title}</p>
      <p className={`text-4xl font-bold ${colorClass}`}>{value}</p>
    </div>
  );
}