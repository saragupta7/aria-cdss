import { HeaderClock } from "./HeaderClock";
import { CHART, StatTile } from "./ChartKit";
import { useParams, Link, useNavigate } from "react-router";
import { ArrowLeft, AlertTriangle, Search, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { patientsApi } from "../../api/patients";
import type { Patient } from "@aria/shared";

const riskLevelMap: Record<string, string> = { low: 'STABLE', medium: 'MODERATE', high: 'CRITICAL', critical: 'CRITICAL' };

// See WardOverview.tsx's bedNumber() — icuBed is "<ward><number>" for
// simulated patients but "<ward>-<number>" for MIMIC ones (multi-letter
// ward codes), so strip the exact ward prefix rather than one letter.
function bedNumber(p: Patient): string {
  if (!p.icuBed) return '1';
  if (p.ward && p.icuBed.startsWith(p.ward)) {
    return p.icuBed.slice(p.ward.length).replace(/^-/, '');
  }
  return p.icuBed.replace(/^[A-Z]+-?/i, '');
}

interface WardPatient extends Patient {
  displayRiskLevel: string;
  bed: string;
  icuDay: number;
  latestVitals: { map: number; heartRate: number; spO2: number };
  displayRiskScore: number;
}

const RISK_FILTERS = ['ALL', 'STABLE', 'MODERATE', 'CRITICAL'] as const;

export function WardDetail() {
  const { wardId } = useParams<{ wardId: string }>();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<WardPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<(typeof RISK_FILTERS)[number]>('ALL');

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setIsLoading(true);
        const data = await patientsApi.getAll();

        // Transform the backend data
        const mapped: WardPatient[] = data.map((p: Patient) => {
          const lastVital = Array.isArray(p.vitals) && p.vitals.length > 0 ? p.vitals[p.vitals.length - 1] : null;
          const sbp = lastVital?.bloodPressureSystolic || 120;
          const dbp = lastVital?.bloodPressureDiastolic || 80;

          return {
            ...p,
            bed: bedNumber(p),
            displayRiskLevel: riskLevelMap[p.riskLevel || 'low'] || 'STABLE',
            displayRiskScore: Math.round((p.riskScore || 0) * 100),
            icuDay: p.admissionDate
              ? Math.max(1, Math.floor((new Date().getTime() - new Date(p.admissionDate).getTime()) / (1000 * 3600 * 24)))
              : 1,
            latestVitals: {
              map: Math.round((sbp + 2 * dbp) / 3),
              heartRate: lastVital?.heartRate || 0,
              spO2: lastVital?.oxygenSaturation || 0
            }
          };
        });

        setPatients(mapped);
      } catch (err: any) {
        setError("Failed to fetch patients.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const wardPatients = patients.filter(p => p.ward === wardId);

  const criticalCount = wardPatients.filter(p => p.displayRiskLevel === 'CRITICAL').length;
  const moderateCount = wardPatients.filter(p => p.displayRiskLevel === 'MODERATE').length;
  const stableCount = wardPatients.filter(p => p.displayRiskLevel === 'STABLE').length;

  const q = search.trim().toLowerCase();
  const visiblePatients = wardPatients.filter(p => {
    if (riskFilter !== 'ALL' && p.displayRiskLevel !== riskFilter) return false;
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.patientId || '').toLowerCase().includes(q) ||
      (p.icuBed || '').toLowerCase().includes(q) ||
      (p.diagnosis || '').toLowerCase().includes(q)
    );
  });

  if (isLoading) {
    return (
      <div className="bg-slate-50/50 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin mb-4" />
          <p className="font-medium">Loading ward details...</p>
        </div>
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
    <div className="bg-slate-50/50 min-h-screen p-8 pb-12">
      <div className="max-w-[1400px] mx-auto">

        <Link to="/dashboard/wards" className="inline-flex items-center gap-2 text-slate-500 font-bold mb-6 hover:text-[#3b82f6] transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Ward Overview
        </Link>


        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="h-14 min-w-[3.5rem] px-3 rounded-xl bg-slate-900 flex items-center justify-center text-white font-tele font-bold text-sm tracking-wide shadow-sm whitespace-nowrap">
              {wardId}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900 leading-tight">Ward {wardId}</h1>
              <p className="text-sm text-slate-500 font-medium">{wardPatients.length} active patients</p>
            </div>
          </div>
          <HeaderClock />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <StatTile label="Total Patients" value={wardPatients.length} accent="#64748b" />
          <StatTile label="Stable" value={stableCount} accent={CHART.blue} />
          <StatTile label="Moderate" value={moderateCount} accent={CHART.amber} />
          <StatTile
            label="Critical"
            value={criticalCount}
            accent={CHART.orange}
            valueColor={criticalCount > 0 ? CHART.orange : undefined}
          />
        </div>

        {/* Patient List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Search & Filter Bar */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4 flex-wrap">
            <div className="bg-white rounded-xl border border-slate-200 h-11 w-80 flex items-center px-4 transition-all focus-within:ring-2 focus-within:ring-blue-100">
              <Search className="w-4 h-4 text-slate-400 mr-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, ID, bed, or diagnosis..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-400"
              />
            </div>
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
              {RISK_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setRiskFilter(f)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    riskFilter === f
                      ? f === 'STABLE' ? 'bg-[#3b82f6] text-white shadow-sm'
                        : f === 'MODERATE' ? 'bg-[#e2a80d] text-white shadow-sm'
                        : f === 'CRITICAL' ? 'bg-[#e85d22] text-white shadow-sm'
                        : 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {f === 'ALL' ? `All (${wardPatients.length})` : f}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Bed</th>
                  <th className="px-6 py-4">Age / Gender</th>
                  <th className="px-6 py-4">ICU Day</th>
                  <th className="px-6 py-4">MAP</th>
                  <th className="px-6 py-4">HR</th>
                  <th className="px-6 py-4">SpO2</th>
                  <th className="px-6 py-4">Risk Score</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {visiblePatients.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400 font-medium">
                      No patients match the current search or filter.
                    </td>
                  </tr>
                ) : (
                  visiblePatients.map((patient) => (
                    <tr
                      key={patient.patientId}
                      onClick={() => navigate(`/dashboard/patient/${patient.patientId}`)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#0f172a] text-white flex items-center justify-center text-sm font-bold shadow-sm shrink-0">
                            {patient.name.split(' ')[0][0]}{patient.name.split(' ')[1]?.[0]}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight group-hover:text-[#3b82f6] transition-colors">{patient.name}</p>
                            <p className="text-slate-500 text-xs font-medium">{patient.patientId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">{patient.icuBed}</td>
                      <td className="px-6 py-4 text-slate-700 font-medium whitespace-nowrap">{patient.age}y, {patient.gender || 'Unknown'}</td>
                      <td className="px-6 py-4 text-slate-700 font-medium">Day {patient.icuDay}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{patient.latestVitals.map}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{patient.latestVitals.heartRate}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{patient.latestVitals.spO2}%</td>
                      <td className="px-6 py-4">
                        <span className={`font-bold ${
                          patient.displayRiskLevel === 'STABLE' ? 'text-[#3b82f6]' : patient.displayRiskLevel === 'MODERATE' ? 'text-[#e2a80d]' : 'text-[#e85d22]'
                        }`}>{patient.displayRiskScore}%</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
                            patient.displayRiskLevel === 'STABLE' ? 'bg-[#3b82f6]/10 text-[#3b82f6]' :
                            patient.displayRiskLevel === 'MODERATE' ? 'bg-[#e2a80d]/10 text-[#d97706]' :
                            'bg-[#e85d22]/10 text-[#e85d22]'
                          }`}>
                            {patient.displayRiskLevel}
                          </span>
                          {(patient.riskLevel === 'high' || patient.riskLevel === 'critical') && (
                            <span className="text-[10px] font-bold text-[#d97706] whitespace-nowrap">
                              Instability in {patient.riskLevel === 'critical' ? '1-2 hrs' : '4-6 hrs'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Clean text-only stat card for the Ward Header
