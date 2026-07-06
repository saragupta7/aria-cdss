import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { ArrowLeft, TrendingDown, TrendingUp, AlertTriangle, FileText, BrainCircuit, HeartPulse, Wind, Droplets, Loader2, CheckCircle2 } from "lucide-react";
import { patientsApi, type PatientNote } from "../../api/patients";
import { alertsApi } from "../../api/alerts";
import { useAuth } from "../context/AuthContext";
import type { Patient, Alert } from "@aria/shared";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from "recharts";

type TabType = 'Overview' | 'Flowsheet (Vitals)' | 'Trend Board' | 'SHAP' | 'Alerts' | 'Notes';

export function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>('Overview');

  const [patientAlerts, setPatientAlerts] = useState<Alert[]>([]);
  const [notes, setNotes] = useState<PatientNote[]>([]);
  const [discharging, setDischarging] = useState(false);

  useEffect(() => {
  if (!id) return;

  const fetchPatient = async () => {
    try {
      setLoading(true);

      const data = await patientsApi.getById(id);

      setPatient(data);
      // Fetch alerts + notes using the resolved Mongo _id
      const [alerts, patientNotes] = await Promise.all([
        alertsApi.getByPatient(data._id).catch(() => []),
        patientsApi.getNotes(data._id).catch(() => []),
      ]);
      setPatientAlerts(alerts);
      setNotes(patientNotes);
    } catch (err) {
      console.error(err);
      setError("Failed to load patient");
    } finally {
      setLoading(false);
    }
  };

  fetchPatient();
}, [id]);

  const handleAddNote = async (text: string) => {
    if (!patient) return;
    const note = await patientsApi.addNote(patient._id, text);
    setNotes((prev) => [note, ...prev]);
  };

  const handleDischarge = async () => {
    if (!patient) return;
    if (!window.confirm(`Discharge ${patient.name} from the ICU?`)) return;
    setDischarging(true);
    try {
      await patientsApi.discharge(patient._id);
      navigate(`/dashboard/ward/${patient.ward || 'A'}`);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to discharge patient");
      setDischarging(false);
    }
  };

  if (loading) {
    return <div>Loading patient...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!patient) {
    return (
      <div className="bg-slate-50/50 min-h-screen p-12">
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-200">
          <p className="text-slate-500 font-medium">Patient not found</p>
          <Link to="/" className="text-[#3b82f6] mt-4 inline-block font-bold hover:underline">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  // Map Live Time-Series Data from Database
  const vitalsData = Array.isArray(patient.vitals) && patient.vitals.length > 0 
    ? patient.vitals.map((v: any) => {
        const sbp = v.bloodPressureSystolic || 120;
        const dbp = v.bloodPressureDiastolic || 80;
        const map = Math.round((sbp + 2 * dbp) / 3);
        const date = new Date(v.timestamp);
        return {
          time: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`,
          map,
          hr: v.heartRate || 0,
          lactate: v.lactate || 0,
          spo2: v.oxygenSaturation || 0,
          rr: v.respiratoryRate || 0,
          sbp,
          dbp,
          creatinine: v.creatinine || 1.1 // fallback
        };
      })
    : [];

  const latestVitals = vitalsData.length > 0 
    ? vitalsData[vitalsData.length - 1] 
    : { map: 0, hr: 0, spo2: 0, rr: 0, sbp: 0, dbp: 0, lactate: 0, creatinine: 0 };

  const times = vitalsData.map(v => v.time);

  // Prefer real SHAP output from the HemoAlert ml-service (patient.riskShap);
  // fall back to a client-side heuristic when the model hasn't scored this
  // patient yet (e.g. ml-service not running / not trained).
  const heuristicShapData = [
    { feature: 'MAP', impact: latestVitals.map < 65 ? 40 : latestVitals.map < 70 ? 22 : 6, value: `${latestVitals.map} mmHg` },
    { feature: 'Lactate', impact: latestVitals.lactate > 4 ? 35 : latestVitals.lactate > 2 ? 20 : 5, value: `${Number(latestVitals.lactate).toFixed(1)} mmol/L` },
    { feature: 'SpO2', impact: latestVitals.spo2 && latestVitals.spo2 < 90 ? 30 : latestVitals.spo2 && latestVitals.spo2 < 94 ? 15 : 5, value: `${latestVitals.spo2}%` },
    { feature: 'Heart Rate', impact: latestVitals.hr > 110 ? 25 : latestVitals.hr > 100 ? 12 : 5, value: `${latestVitals.hr} bpm` },
    { feature: 'Resp Rate', impact: latestVitals.rr > 22 ? 20 : latestVitals.rr > 18 ? 10 : 4, value: `${latestVitals.rr} /min` },
  ].sort((a, b) => b.impact - a.impact);

  const shapData = patient.riskShap && patient.riskShap.length > 0
    ? patient.riskShap
    : heuristicShapData;
  const isRealShap = Boolean(patient.riskShap && patient.riskShap.length > 0);

  const readingsCount = vitalsData.length;
  const lastUpdated = patient.vitals?.length
    ? new Date(patient.vitals[patient.vitals.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';

  // Helper Mappings
  const displayRiskScore = Math.round((patient.riskScore || 0) * 100);
  const riskLevelMap: Record<string, string> = { low: 'STABLE', medium: 'MODERATE', high: 'CRITICAL', critical: 'CRITICAL' };
  const displayRiskLevel = riskLevelMap[patient.riskLevel || 'low'] || 'STABLE';
  const icuDays = patient.admissionDate 
    ? Math.max(1, Math.floor((new Date().getTime() - new Date(patient.admissionDate).getTime()) / (1000 * 3600 * 24)))
    : 1;

  return (
    <div className="bg-slate-50/50 min-h-screen pb-12">
      
      {/* Sleek Top Banner & Breadcrumb */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-10 flex items-center justify-between">
        <Link to={`/dashboard/ward/${patient.ward || 'ICU'}`} className="inline-flex items-center gap-2 text-slate-500 font-bold hover:text-[#3b82f6] transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Ward {patient.ward || 'ICU'}
        </Link>
        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab('Notes')}
            className="px-5 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 shadow-sm transition-all flex items-center gap-2"
          >
            <FileText className="w-4 h-4" /> Add Note
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={handleDischarge}
              disabled={discharging}
              className="px-5 py-2 bg-[#e85d22] text-white rounded-lg text-sm font-bold hover:bg-[#d24e17] shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {discharging ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Discharge
            </button>
          )}
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto px-8 pt-8">
        
        {/* REBUILT: Clinical Header Banner */}
        <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-4 mb-3">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{patient.name}</h1>
                <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                  displayRiskLevel === 'STABLE' ? 'bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20' :
                  displayRiskLevel === 'MODERATE' ? 'bg-[#f59e0b]/10 text-[#d97706] border border-[#f59e0b]/30' :
                  'bg-[#e85d22]/10 text-[#e85d22] border border-[#e85d22]/20'
                }`}>
                  <span className={`w-2 h-2 rounded-sm mr-2 ${
                    displayRiskLevel === 'STABLE' ? 'bg-[#3b82f6]' :
                    displayRiskLevel === 'MODERATE' ? 'bg-[#f59e0b]' :
                    'bg-[#e85d22] animate-pulse'
                  }`}></span>
                  {displayRiskLevel}
                </span>
                <span className="text-slate-400 font-mono text-sm tracking-widest">{patient._id}</span>
              </div>
              
              {/* Demographics Pill Row */}
              <div className="flex flex-wrap gap-2">
                <Badge label="Age" value={`${patient.age}y`} />
                <Badge label="Sex" value={patient.gender || 'Unknown'} />
                <Badge label="Location" value={`Ward ${patient.ward || 'ICU'} • Bed ${patient.icuBed || 'Unknown'}`} />
                <Badge label="Admitted" value={`ICU Day ${icuDays}`} />
                <Badge label="Code" value="FULL CODE" alert={false} />
                <Badge label="Allergies" value="NKA" alert={false} />
              </div>
            </div>

            {/* Quick System Status */}
            {patient.riskLevel === 'critical' && (
              <div className="bg-[#e85d22]/5 border border-[#e85d22]/20 rounded-xl p-4 text-right">
                <p className="text-[#e85d22] text-xs font-bold uppercase tracking-wider mb-1">Critical Risk</p>
                <p className="text-slate-900 font-bold flex items-center justify-end gap-2">
                  <Droplets className="w-4 h-4 text-[#e85d22]" /> Immediate Attention
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-200 mb-8">
          {(['Overview', 'Flowsheet (Vitals)', 'Trend Board', 'SHAP', 'Alerts', 'Notes'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${
                activeTab === tab
                  ? 'border-[#3b82f6] text-[#3b82f6] bg-[#3b82f6]/5 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-t-lg'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW (Kept from previous, highly dense and functional) */}
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-4 space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-slate-900 font-bold text-lg">Current Vitals</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live
                  </span>
                </div>
                <div className="space-y-1">
                  <VitalRow label="MAP" value={latestVitals.map} unit="mmHg" trend="down" statusColor={latestVitals.map < 65 ? "text-[#e85d22]" : undefined} />
                  <VitalRow label="Heart Rate" value={latestVitals.hr} unit="bpm" trend="up" />
                  <VitalRow label="SpO2" value={latestVitals.spo2} unit="%" />
                  <VitalRow label="Resp Rate" value={latestVitals.rr} unit="bpm" />
                  <VitalRow label="Blood Pressure" value={`${latestVitals.sbp}/${latestVitals.dbp}`} unit="mmHg" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-slate-900 font-bold text-lg mb-4">Recent Labs</h3>
                <div className="space-y-1">
                  <VitalRow label="Lactate" value={Number(latestVitals.lactate).toFixed(1)} unit="mmol/L" trend="up" statusColor={latestVitals.lactate > 2.0 ? "text-[#e85d22]" : undefined} />
                  <VitalRow label="SpO2" value={latestVitals.spo2} unit="%" statusColor={latestVitals.spo2 && latestVitals.spo2 < 94 ? "text-[#e85d22]" : undefined} />
                </div>
              </div>
            </div>

            <div className="col-span-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-center">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">AI Risk Score</p>
                  <div className="flex items-baseline gap-3">
                    <p className={`text-5xl font-bold leading-none ${
                      displayRiskScore >= 75 ? 'text-[#e85d22]' :
                      displayRiskScore >= 50 ? 'text-[#f59e0b]' :
                      'text-[#3b82f6]'
                    }`}>{displayRiskScore}%</p>
                    <p className="text-slate-400 font-medium text-sm">instability probability</p>
                  </div>
                </div>
                
                {patient.riskLevel === 'high' || patient.riskLevel === 'critical' ? (
                  <div className="bg-[#f59e0b]/5 rounded-2xl p-6 shadow-sm border border-[#f59e0b]/20 flex flex-col justify-center">
                    <p className="text-[#d97706] text-xs font-bold uppercase tracking-wider mb-2">Estimated Lead Time</p>
                    <div className="flex items-baseline gap-3">
                      <p className="text-5xl font-bold text-[#f59e0b] leading-none">{patient.riskLevel === 'critical' ? '1-2 hrs' : '4-6 hrs'}</p>
                      <p className="text-[#d97706]/70 font-medium text-sm">until critical event</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#3b82f6]/5 rounded-2xl p-6 shadow-sm border border-[#3b82f6]/10 flex flex-col justify-center">
                    <p className="text-[#3b82f6] text-xs font-bold uppercase tracking-wider mb-2">Clinical Status</p>
                    <p className="text-2xl font-bold text-[#3b82f6]">{displayRiskLevel === 'STABLE' ? 'Currently Stable' : 'Monitor Closely'}</p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-slate-900 font-bold text-lg">MAP & HR Trend (12h)</h3>
                  <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#0f172a]"></span> MAP</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#60a5fa]"></span> Heart Rate</span>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={vitalsData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} dy={10} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[40, 120]} />
                      <YAxis yAxisId="right" orientation="right" hide domain={[40, 120]} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                      <ReferenceLine y={65} yAxisId="left" stroke="#e85d22" strokeDasharray="5 5" strokeOpacity={0.8} />
                      <Line yAxisId="left" type="monotone" dataKey="map" name="MAP" stroke="#0f172a" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} />
                      <Line yAxisId="right" type="monotone" dataKey="hr" name="Heart Rate" stroke="#60a5fa" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REBUILT TAB 2: FLOWSHEET (Dense, grid-based vitals log) */}
        {activeTab === 'Flowsheet (Vitals)' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-900">ICU Vitals Flowsheet</h2>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Past 12 Hours</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 border-r w-48">Parameter</th>
                    {times.map(t => (
                      <th key={t} className="px-4 py-3 text-xs font-bold text-slate-900 text-center border-b border-slate-200">{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-sm font-medium">
                  {/* MAP Row */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 border-b border-slate-100 border-r text-slate-700 font-bold bg-slate-50/30">MAP (mmHg)</td>
                    {vitalsData.map((d, i) => (
                      <td key={i} className={`px-4 py-4 border-b border-slate-100 text-center font-bold ${d.map < 65 ? 'text-[#e85d22] bg-[#e85d22]/5' : 'text-slate-900'}`}>{d.map}</td>
                    ))}
                  </tr>
                  {/* HR Row */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 border-b border-slate-100 border-r text-slate-700 font-bold bg-slate-50/30">Heart Rate (bpm)</td>
                    {vitalsData.map((d, i) => (
                      <td key={i} className={`px-4 py-4 border-b border-slate-100 text-center font-bold ${d.hr > 100 ? 'text-[#f59e0b]' : 'text-slate-900'}`}>{d.hr}</td>
                    ))}
                  </tr>
                  {/* SpO2 Row */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 border-b border-slate-100 border-r text-slate-700 font-bold bg-slate-50/30">SpO2 (%)</td>
                    {vitalsData.map((d, i) => (
                      <td key={i} className="px-4 py-4 border-b border-slate-100 text-center text-slate-900">{d.spo2}</td>
                    ))}
                  </tr>
                  {/* Resp Rate Row */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 border-b border-slate-100 border-r text-slate-700 font-bold bg-slate-50/30">Resp Rate (bpm)</td>
                    {vitalsData.map((d, i) => (
                      <td key={i} className="px-4 py-4 border-b border-slate-100 text-center text-slate-900">{d.rr}</td>
                    ))}
                  </tr>
                  {/* Lactate Row */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 border-b border-slate-100 border-r text-slate-700 font-bold bg-slate-50/30">Lactate (mmol/L)</td>
                    {vitalsData.map((d, i) => (
                      <td key={i} className={`px-4 py-4 border-b border-slate-100 text-center font-bold ${d.lactate > 2.0 ? 'text-[#e85d22] bg-[#e85d22]/5' : 'text-slate-900'}`}>{Number(d.lactate).toFixed(1)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REBUILT TAB 3: TREND BOARD (Multi-parameter stacked charts) */}
        {activeTab === 'Trend Board' && (
          <div className="grid grid-cols-12 gap-6">
            
            {/* Left Col: Primary Hemodynamics */}
            <div className="col-span-8 space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                    <HeartPulse className="w-5 h-5 text-[#0f172a]" /> Hemodynamics (MAP & HR)
                  </div>
                  <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#0f172a]"></span> MAP</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#60a5fa]"></span> Heart Rate</span>
                  </div>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={vitalsData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} dy={10} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[40, 120]} />
                      <YAxis yAxisId="right" orientation="right" hide domain={[40, 120]} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                      <ReferenceLine y={65} yAxisId="left" stroke="#e85d22" strokeDasharray="5 5" strokeOpacity={0.8} />
                      <Line yAxisId="left" type="monotone" dataKey="map" name="MAP" stroke="#0f172a" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} />
                      <Line yAxisId="right" type="monotone" dataKey="hr" name="Heart Rate" stroke="#60a5fa" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Respiratory Trend */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                    <Wind className="w-5 h-5 text-[#3b82f6]" /> Respiratory (SpO2)
                  </div>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={vitalsData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSpo2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[85, 100]} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                      <ReferenceLine y={92} stroke="#f59e0b" strokeDasharray="5 5" strokeOpacity={0.8} />
                      <Area type="monotone" dataKey="spo2" name="SpO2 %" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSpo2)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Right Col: Metabolic & Labs */}
            <div className="col-span-4 space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                    <Droplets className="w-5 h-5 text-[#e85d22]" /> Lactate Clearance
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={vitalsData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                      <ReferenceLine y={2.0} stroke="#e85d22" strokeDasharray="5 5" strokeOpacity={0.8} />
                      <Bar dataKey="lactate" name="Lactate" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={24}>
                        {vitalsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.lactate > 2.0 ? '#e85d22' : '#f59e0b'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Lab Highlights Widget — from the patient's latest recorded values */}
              <div className="bg-[#3b82f6]/5 rounded-2xl p-6 border border-[#3b82f6]/20">
                <h3 className="font-bold text-[#0f172a] mb-4">Latest Labs</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-600 text-sm font-bold">Lactate</span>
                    <span className={`font-bold ${latestVitals.lactate > 2.0 ? 'text-[#e85d22]' : 'text-slate-900'}`}>
                      {Number(latestVitals.lactate).toFixed(1)} mmol/L {latestVitals.lactate > 2.0 ? '↑' : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-600 text-sm font-bold">MAP</span>
                    <span className={`font-bold ${latestVitals.map < 65 ? 'text-[#e85d22]' : 'text-slate-900'}`}>
                      {latestVitals.map} mmHg {latestVitals.map < 65 ? '↓' : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-600 text-sm font-bold">SpO2</span>
                    <span className={`font-bold ${latestVitals.spo2 && latestVitals.spo2 < 94 ? 'text-[#e85d22]' : 'text-slate-900'}`}>
                      {latestVitals.spo2}% {latestVitals.spo2 && latestVitals.spo2 < 94 ? '↓' : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SHAP (Explainable AI) */}
        {activeTab === 'SHAP' && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-8 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <BrainCircuit className="w-6 h-6 text-[#3b82f6]" />
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-slate-900">Explainable AI (SHAP) Analysis</h2>
                  <p className="text-sm text-slate-500 font-medium">Factors driving the {displayRiskScore}% risk prediction</p>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${
                  isRealShap ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}>
                  {isRealShap ? 'HemoAlert model' : 'Heuristic estimate'}
                </span>
              </div>
              <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={shapData} layout="vertical" margin={{ top: 0, right: 20, left: 40, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="feature" type="category" axisLine={false} tickLine={false} tick={{ fill: '#0f172a', fontSize: 12, fontWeight: 700 }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="impact" name="Risk Impact %" fill="#e85d22" radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="col-span-4 space-y-4">
              <div className="bg-[#3b82f6]/5 rounded-2xl p-6 border border-[#3b82f6]/20">
                <h3 className="font-bold text-slate-900 mb-2">Prediction Basis</h3>
                <p className="text-3xl font-bold text-[#3b82f6]">{readingsCount} <span className="text-base font-medium text-slate-500">readings</span></p>
                <p className="text-xs text-slate-500 font-medium mt-1">Last updated at {lastUpdated}</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-4">Key Drivers</h3>
                <div className="space-y-3">
                  {shapData.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                      <span className="text-slate-600 font-medium">{item.feature}</span>
                      <span className="font-bold text-slate-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: ALERTS */}
        {activeTab === 'Alerts' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Patient Alert History</h2>
            {patientAlerts.length === 0 ? (
              <div className="flex items-center gap-3 p-6 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-medium">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                No alerts recorded for this patient.
              </div>
            ) : (
              <div className="space-y-4">
                {patientAlerts.map((alert) => {
                  const isCrit = alert.severity === 'critical';
                  return (
                    <div
                      key={alert._id}
                      className={`flex items-start gap-4 p-4 rounded-xl border ${
                        alert.status === 'active' && isCrit ? 'border-[#e85d22]/30 bg-[#e85d22]/5' : 'border-slate-200'
                      }`}
                    >
                      <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${isCrit ? 'text-[#e85d22]' : 'text-[#f59e0b]'}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-bold text-slate-900">{(alert.type || 'alert').replace(/_/g, ' ')}</p>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              alert.status === 'active' ? 'bg-[#e85d22] text-white' :
                              alert.status === 'acknowledged' ? 'bg-[#f59e0b]/20 text-[#d97706]' :
                              'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {alert.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{alert.message}</p>
                        <p className="text-xs text-slate-400 font-bold">
                          {new Date(alert.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: NOTES */}
        {activeTab === 'Notes' && (
          <NotesTab notes={notes} onAdd={handleAddNote} />
        )}

      </div>
    </div>
  );
}

// Small helper component for the clinical banner
function Badge({ label, value, alert = false }: { label: string, value: string, alert?: boolean }) {
  return (
    <div className={`flex items-center border rounded-lg overflow-hidden ${alert ? 'border-[#e85d22]/30' : 'border-slate-200'}`}>
      <span className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${alert ? 'bg-[#e85d22]/10 text-[#e85d22]' : 'bg-slate-50 text-slate-500'}`}>
        {label}
      </span>
      <span className={`px-3 py-1.5 text-sm font-bold ${alert ? 'text-[#e85d22]' : 'text-slate-900'}`}>
        {value}
      </span>
    </div>
  );
}

// Notes tab — real clinical notes backed by the API
function NotesTab({ notes, onAdd }: { notes: PatientNote[]; onAdd: (text: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!text.trim()) return;
    setSaving(true);
    setError("");
    try {
      await onAdd(text.trim());
      setText("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to add note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 max-w-3xl">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Add a clinical note..."
          className="w-full resize-none border border-slate-200 rounded-xl p-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#3b82f6]/30 focus:border-[#3b82f6]"
        />
        {error && <p className="text-sm text-red-600 font-medium mt-2">{error}</p>}
        <div className="flex justify-end mt-3">
          <button
            onClick={submit}
            disabled={saving || !text.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-[#3b82f6] text-white rounded-xl font-bold text-sm hover:bg-[#2563eb] transition-all disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            <FileText className="w-4 h-4" /> Save Note
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-slate-400 font-medium text-center py-6">No notes yet. Add the first clinical note above.</p>
      ) : (
        notes.map((note, i) => (
          <div key={note._id || i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <p className="font-bold text-slate-900">
                {note.authorName || 'Unknown'}
                {note.authorRole && <span className="ml-2 text-xs font-medium text-slate-400 uppercase tracking-wider">{note.authorRole}</span>}
              </p>
              <p className="text-xs text-slate-400 font-bold">
                {new Date(note.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{note.text}</p>
          </div>
        ))
      )}
    </div>
  );
}

// Helper for the overview tab
function VitalRow({ label, value, unit, trend, statusColor }: any) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-slate-500 text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`font-bold ${statusColor || 'text-slate-900'}`}>
          {value} {unit && <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">{unit}</span>}
        </span>
        {trend && (
          trend === 'down' ? <TrendingDown className={`w-4 h-4 ${statusColor || 'text-slate-400'}`} /> : 
          <TrendingUp className={`w-4 h-4 ${statusColor || 'text-slate-400'}`} />
        )}
      </div>
    </div>
  );
}