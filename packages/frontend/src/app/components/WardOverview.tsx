import { HeaderClock } from "./HeaderClock";
import { CHART, StatTile } from "./ChartKit";
import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Building2, Users, AlertTriangle, Search, ChevronRight, UserPlus } from "lucide-react";
import { patientsApi } from "../../api/patients";
import type { Patient } from "@aria/shared";
import { useAuth } from "../context/AuthContext";
import { AdmitPatientModal } from "./AdmitPatientModal";

const riskLevelMap: Record<string, string> = { low: 'STABLE', medium: 'MODERATE', high: 'CRITICAL', critical: 'CRITICAL' };

// icuBed is "<ward><number>" for simulated patients (e.g. "A7") but
// "<ward>-<number>" for MIMIC-sourced ones (e.g. "MICU-14") since ward
// codes there are multi-letter. Strip the exact ward prefix rather than
// just one leading letter, so both formats reduce to a plain bed number.
function bedNumber(p: Patient): string {
  if (!p.icuBed) return '1';
  if (p.ward && p.icuBed.startsWith(p.ward)) {
    return p.icuBed.slice(p.ward.length).replace(/^-/, '');
  }
  return p.icuBed.replace(/^[A-Z]+-?/i, '');
}

interface OverviewPatient extends Patient {
  displayRiskLevel: string;
  bed: string;
}

export function WardOverview() {
  const [patients, setPatients] = useState<OverviewPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const [showAdmitModal, setShowAdmitModal] = useState(false);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const data = await patientsApi.getAll();
      
      const mapped: OverviewPatient[] = data.map((p: Patient) => {
        return {
          ...p,
          bed: bedNumber(p),
          displayRiskLevel: riskLevelMap[p.riskLevel || 'low'] || 'STABLE',
        };
      });
      setPatients(mapped);
    } catch (err) {
      console.error(err);
      setError("Failed to load ward data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  if (loading && patients.length === 0) {
    return <div className="min-h-screen p-8 bg-slate-50/50 flex items-center justify-center font-medium text-slate-500">Loading ward data...</div>;
  }

  if (error) {
    return <div className="min-h-screen p-8 bg-slate-50/50 flex items-center justify-center font-medium text-red-500">{error}</div>;
  }

  // A ward stays fully visible when its name matches the query; otherwise
  // it is narrowed down to just its matching patients (and hidden if none).
  const q = search.trim().toLowerCase();
  const matchesPatient = (p: OverviewPatient) =>
    p.name.toLowerCase().includes(q) ||
    (p.patientId || '').toLowerCase().includes(q) ||
    (p.icuBed || '').toLowerCase().includes(q) ||
    (p.diagnosis || '').toLowerCase().includes(q);

  const wards = Array.from(new Set(patients.map(p => p.ward).filter(Boolean)))
    .sort()
    .filter(ward =>
      !q ||
      `ward ${ward}`.toLowerCase().includes(q) ||
      patients.some(p => p.ward === ward && matchesPatient(p))
    );

  const getWardStats = (ward: string) => {
    const allWardPatients = patients.filter(p => p.ward === ward);
    const wardMatchesQuery = !q || `ward ${ward}`.toLowerCase().includes(q);
    const wardPatients = wardMatchesQuery ? allWardPatients : allWardPatients.filter(matchesPatient);
    return {
      total: allWardPatients.length,
      critical: allWardPatients.filter(p => p.displayRiskLevel === 'CRITICAL').length,
      moderate: allWardPatients.filter(p => p.displayRiskLevel === 'MODERATE').length,
      stable: allWardPatients.filter(p => p.displayRiskLevel === 'STABLE').length,
      patients: wardPatients,
    };
  };

  const totalPatients = patients.length;
  const totalCritical = patients.filter(p => p.displayRiskLevel === 'CRITICAL').length;
  const totalModerate = patients.filter(p => p.displayRiskLevel === 'MODERATE').length;
  const totalStable = patients.filter(p => p.displayRiskLevel === 'STABLE').length;

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
              <h1 className="font-display text-2xl font-bold text-slate-900 leading-tight">Ward Overview</h1>
              <p className="text-sm text-slate-500 font-medium">System-wide patient distribution</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-11 w-80 flex items-center px-4 transition-all focus-within:ring-2 focus-within:ring-blue-100">
              <Search className="w-4 h-4 text-slate-400 mr-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search wards or patients..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-400"
              />
            </div>
            {(user?.role === 'admin' || user?.role === 'senior') && (
              <button 
                onClick={() => setShowAdmitModal(true)}
                className="bg-[#0f172a] text-white px-5 py-2.5 h-11 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                Admit Patient
              </button>
            )}
            <HeaderClock />
          </div>
        </div>

        {/* Compact System Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatTile label="Total Census" value={totalPatients} icon={Users} accent="#64748b" />
          <StatTile label="Stable" value={totalStable} icon={Building2} accent={CHART.blue} />
          <StatTile label="Moderate" value={totalModerate} icon={AlertTriangle} accent={CHART.amber} />
          <StatTile
            label="Critical"
            value={totalCritical}
            icon={AlertTriangle}
            accent={CHART.orange}
            valueColor={totalCritical > 0 ? CHART.orange : undefined}
          />
        </div>

        {/* Ward Sections */}
        <div className="space-y-6">
          {wards.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-6 py-12 text-center text-slate-400 font-medium">
              No wards or patients match "{search}".
            </div>
          )}
          {wards.map((ward) => {
            const stats = getWardStats(ward);
            return (
              <div key={ward} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  
                  {/* Left Side: Ward Title */}
                  <div className="flex items-center gap-4">
                    <div className="h-10 min-w-[2.5rem] px-2.5 rounded-lg bg-slate-900 flex items-center justify-center text-white font-tele font-bold text-[11px] tracking-wide shadow-sm whitespace-nowrap">
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
                      <MiniStat label="MOD" value={stats.moderate} dotColor="bg-[#e2a80d]" />
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
                        key={patient.patientId}
                        to={`/dashboard/patient/${patient.patientId}`}
                        className="bg-white rounded-xl p-4 border border-slate-200 transition-all hover:shadow-md hover:border-slate-400 flex flex-col justify-between group"
                      >
                        <div>
                          <div className="flex items-start justify-between mb-3">
                            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              patient.displayRiskLevel === 'STABLE' ? 'bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20' :
                              patient.displayRiskLevel === 'MODERATE' ? 'bg-[#e2a80d]/10 text-[#d97706] border border-[#e2a80d]/30' :
                              'bg-[#e85d22]/10 text-[#e85d22] border border-[#e85d22]/20'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-sm ${
                                patient.displayRiskLevel === 'STABLE' ? 'bg-[#3b82f6]' :
                                patient.displayRiskLevel === 'MODERATE' ? 'bg-[#e2a80d]' :
                                'bg-[#e85d22] animate-pulse'
                              }`}></span>
                              {patient.displayRiskLevel}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">{patient.patientId}</span>
                          </div>
                          
                          <div className="text-slate-900 text-sm font-bold mb-1 group-hover:text-slate-600 transition-colors">{patient.name}</div>
                          <div className="text-slate-500 text-[11px] font-medium mb-3">
                            {patient.age}y, {patient.gender || 'Unknown'} • Bed {patient.bed}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {(patient.riskLevel === 'high' || patient.riskLevel === 'critical') && (
                            <div className="bg-[#e2a80d]/10 border border-[#e2a80d]/30 text-[#d97706] px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-center">
                              Instability: {patient.riskLevel === 'critical' ? '1-2 hrs' : '4-6 hrs'}
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

        {showAdmitModal && (
          <AdmitPatientModal 
            onClose={() => setShowAdmitModal(false)} 
            onAdmit={() => { fetchPatients(); }} 
          />
        )}
      </div>
    </div>
  );
}

// Compact Stat Card

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