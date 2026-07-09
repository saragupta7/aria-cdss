import { useState, useEffect } from "react";
import { FlaskConical, RefreshCcw, Check, BrainCircuit, Calculator } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import api from "../../api/client";

interface SavedScenario {
  id: number;
  mapNow: number; hr: number; spo2: number; lactate: number; riskScore: number; riskLevel: string;
}

interface ModelPrediction {
  source: 'model' | 'heuristic';
  riskScore?: number;   // 0-1 calibrated probability when source === 'model'
  riskLevel?: string;
  shapValues?: { feature: string; value: string; impact: number }[];
}

export function Simulation() {
  // States matching your Figma reference's exact values
  const [mapNow, setMapNow] = useState(68);
  const [map1h, setMap1h] = useState(74);
  const [map3h, setMap3h] = useState(82);
  const [hr, setHr] = useState(102);
  const [spo2, setSpo2] = useState(94);
  const [rr, setRr] = useState(22);
  const [lactate, setLactate] = useState(2.8);
  const [creatinine, setCreatinine] = useState(1.6);
  const [sbp, setSbp] = useState(108);
  const [dbp, setDbp] = useState(64);
  const [vasopressor, setVasopressor] = useState(false);

  // Derived Clinical Metrics
  const shockIndex = (hr / sbp).toFixed(2);
  const mapSlope = ((mapNow - map3h) / 3).toFixed(1);
  const pulsePressure = sbp - dbp;
  const hrMapProduct = hr * mapNow;

  // Heuristic fallback — used when the HemoAlert ml-service is unreachable
  // or has no trained model loaded. Otherwise the real model's calibrated
  // probability (fetched below) drives the visuals instead.
  const calculateRisk = () => {
    let score = 5;
    if (mapNow < 65) score += 35;
    else if (mapNow < 70) score += 15;
    if (hr > 100) score += 20;
    if (lactate > 2.0) score += 25;
    if (spo2 < 92) score += 15;
    if (parseFloat(mapSlope) < -3) score += 10;
    if (vasopressor) score += 15;
    return Math.min(score, 99);
  };

  // Ask the backend to score this scenario with the real model, debounced so
  // slider drags don't fire a request per pixel.
  const [prediction, setPrediction] = useState<ModelPrediction>({ source: 'heuristic' });
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const res = await api.post('/patients/sandbox/predict', {
          mapNow, map1h, map3h, hr, spo2, rr, lactate, creatinine, sbp, dbp, vasopressor
        });
        setPrediction(res.data);
      } catch {
        setPrediction({ source: 'heuristic' });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [mapNow, map1h, map3h, hr, spo2, rr, lactate, creatinine, sbp, dbp, vasopressor]);

  const isModelScore = prediction.source === 'model' && prediction.riskScore != null;
  const riskScore = isModelScore
    ? Math.round(prediction.riskScore! * 100)
    : calculateRisk();
  const riskLevel = isModelScore
    ? (prediction.riskLevel === 'critical' || prediction.riskLevel === 'high' ? 'CRITICAL'
      : prediction.riskLevel === 'medium' ? 'MODERATE' : 'STABLE')
    : riskScore >= 75 ? 'CRITICAL' : riskScore >= 50 ? 'MODERATE' : 'STABLE';
  const riskColor = riskScore >= 75 ? '#e85d22' : riskScore >= 50 ? '#f59e0b' : '#3b82f6';
  
  const pieData = [
    { name: 'Risk', value: riskScore, color: riskColor },
    { name: 'Safe', value: 100 - riskScore, color: '#f1f5f9' }
  ];

  const resetSim = () => {
    setMapNow(70); setMap1h(70); setMap3h(70); setHr(80); setSpo2(98);
    setRr(16); setLactate(1.2); setCreatinine(1.0); setSbp(120); setDbp(80); setVasopressor(false);
  };

  const [scenarios, setScenarios] = useState<SavedScenario[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('aria_scenarios') || '[]');
    } catch {
      return [];
    }
  });
  const [justSaved, setJustSaved] = useState(false);

  const saveScenario = () => {
    const next = [
      ...scenarios,
      { id: Date.now(), mapNow, hr, spo2, lactate, riskScore, riskLevel },
    ].slice(-10);
    setScenarios(next);
    localStorage.setItem('aria_scenarios', JSON.stringify(next));
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
  };

  const clearScenarios = () => {
    setScenarios([]);
    localStorage.removeItem('aria_scenarios');
  };

  return (
    <div className="bg-slate-50/50 min-h-screen p-8 pb-12">
      <div className="max-w-[1400px] mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
            <FlaskConical className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">Training Sandbox</h1>
            <p className="text-sm text-slate-500 font-medium">Modify parameters to see how the AI predicts instability</p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          
          {/* Left Column: Parameter Inputs */}
          <div className="col-span-6 bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Patient Parameters</h2>
              <button onClick={resetSim} className="text-slate-500 hover:text-slate-900 flex items-center gap-2 text-sm font-bold transition-colors bg-slate-50 px-4 py-2 rounded-lg">
                <RefreshCcw className="w-4 h-4" /> Reset
              </button>
            </div>
            
            <div className="space-y-6">
              <SliderControl label="MAP (now)" value={mapNow} min={40} max={120} unit="mmHg" setter={setMapNow} />
              <SliderControl label="MAP (1h ago)" value={map1h} min={40} max={120} unit="mmHg" setter={setMap1h} />
              <SliderControl label="MAP (3h ago)" value={map3h} min={40} max={120} unit="mmHg" setter={setMap3h} />
              <SliderControl label="Heart Rate" value={hr} min={40} max={180} unit="bpm" setter={setHr} />
              <SliderControl label="SpO2" value={spo2} min={70} max={100} unit="%" setter={setSpo2} />
              <SliderControl label="Respiratory Rate" value={rr} min={8} max={40} unit="/min" setter={setRr} />
              <SliderControl label="Lactate" value={lactate} min={0.5} max={10} step={0.1} unit="mmol/L" setter={setLactate} />
              <SliderControl label="Creatinine" value={creatinine} min={0.5} max={5} step={0.1} unit="mg/dL" setter={setCreatinine} />
              <SliderControl label="SBP" value={sbp} min={60} max={200} unit="mmHg" setter={setSbp} />
              <SliderControl label="DBP" value={dbp} min={30} max={120} unit="mmHg" setter={setDbp} />
              
              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <label className="text-sm font-bold text-slate-700">Vasopressor</label>
                <button 
                  onClick={() => setVasopressor(!vasopressor)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${vasopressor ? 'bg-[#3b82f6]' : 'bg-slate-200'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${vasopressor ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: AI Output & Derived Metrics */}
          <div className="col-span-6 space-y-6">
            
            {/* Main AI Donut & Status */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col items-center relative">
              {/* Score source badge — same semantics as the PatientDetail SHAP tab */}
              <div className={`absolute top-5 right-5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                isModelScore
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}>
                {isModelScore ? <BrainCircuit className="w-3 h-3" /> : <Calculator className="w-3 h-3" />}
                {isModelScore ? 'HemoAlert model' : 'Heuristic estimate'}
              </div>
              <div className="w-56 h-56 relative mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={75}
                      outerRadius={100}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                      stroke="none"
                      animationDuration={500}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-5xl font-bold" style={{ color: riskColor }}>{riskScore}%</span>
                </div>
              </div>

              <div className={`px-6 py-2 rounded-full text-sm font-bold uppercase tracking-wider mb-4 border ${
                riskLevel === 'CRITICAL' ? 'bg-[#e85d22]/10 text-[#e85d22] border-[#e85d22]/20' : 
                riskLevel === 'MODERATE' ? 'bg-[#f59e0b]/10 text-[#d97706] border-[#f59e0b]/30' : 
                'bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20'
              }`}>
                {riskLevel === 'CRITICAL' ? 'HIGH RISK' : riskLevel === 'MODERATE' ? 'MODERATE RISK' : 'LOW RISK'}
              </div>

              {riskLevel !== 'STABLE' && (
                <div className="bg-[#f59e0b]/10 text-[#d97706] px-6 py-2 rounded-lg text-sm font-bold border border-[#f59e0b]/20">
                  Predicted instability in {(100 - riskScore) / 10 + 1.2}h
                </div>
              )}
            </div>

            {/* Clinical Recommendation Box */}
            <div className={`rounded-2xl p-6 border-2 bg-white ${
              riskLevel === 'CRITICAL' ? 'border-[#e85d22]' : 
              riskLevel === 'MODERATE' ? 'border-[#f59e0b]' : 
              'border-[#3b82f6]'
            }`}>
              <h3 className={`font-bold mb-2 uppercase tracking-wider ${
                riskLevel === 'CRITICAL' ? 'text-[#e85d22]' : 
                riskLevel === 'MODERATE' ? 'text-[#d97706]' : 
                'text-[#3b82f6]'
              }`}>
                {riskLevel === 'CRITICAL' ? 'HIGH RISK' : riskLevel === 'MODERATE' ? 'WARNING' : 'STABLE'}
              </h3>
              <p className="text-sm text-slate-700 font-medium leading-relaxed">
                {riskLevel === 'CRITICAL' 
                  ? 'Consider fluid resuscitation and senior consult. Monitor MAP closely and prepare for potential escalation of vasopressor support.' 
                  : riskLevel === 'MODERATE' 
                  ? 'Patient parameters are degrading. Increase monitoring frequency and review recent lactate trends.' 
                  : 'Patient is maintaining hemodynamic stability. Continue routine monitoring.'}
              </p>
            </div>

            {/* Derived Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <DerivedMetricCard label="Shock Index" value={shockIndex} alert={parseFloat(shockIndex) > 0.9} />
              <DerivedMetricCard label="MAP Slope" value={mapSlope} alert={parseFloat(mapSlope) < -3} />
              <DerivedMetricCard label="Pulse Pressure" value={pulsePressure} alert={pulsePressure < 30} />
              <DerivedMetricCard label="HR-MAP Product" value={hrMapProduct} alert={hrMapProduct > 10000} />
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <button
                onClick={saveScenario}
                className="py-3 border-2 border-slate-900 text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                {justSaved ? <><Check className="w-4 h-4" /> Saved!</> : 'Save as Scenario'}
              </button>
              <button
                onClick={clearScenarios}
                disabled={scenarios.length === 0}
                className="py-3 border-2 border-slate-200 text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear ({scenarios.length})
              </button>
            </div>

            {/* Saved Scenarios */}
            {scenarios.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-4">Saved Scenarios</h3>
                <div className="space-y-2">
                  {scenarios.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-sm border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                      <span className="text-slate-500 font-medium">
                        MAP {s.mapNow} · HR {s.hr} · SpO2 {s.spo2} · Lac {s.lactate}
                      </span>
                      <span
                        className="font-bold"
                        style={{ color: s.riskLevel === 'CRITICAL' ? '#e85d22' : s.riskLevel === 'MODERATE' ? '#f59e0b' : '#3b82f6' }}
                      >
                        {s.riskScore}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

// Helper component for the sliders
function SliderControl({ label, value, min, max, step = 1, unit, setter }: any) {
  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <label className="text-sm font-medium text-slate-600">{label}</label>
        <span className="text-sm font-bold text-slate-900">{value} <span className="text-slate-400 font-medium">{unit}</span></span>
      </div>
      <input 
        type="range" min={min} max={max} step={step} value={value} 
        onChange={(e) => setter(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0f172a]"
      />
    </div>
  );
}

// Helper component for the 2x2 Derived Metrics grid
function DerivedMetricCard({ label, value, alert }: { label: string, value: string | number, alert: boolean }) {
  return (
    <div className={`rounded-2xl p-5 border text-center ${alert ? 'bg-red-50/50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
      <p className="text-[11px] text-slate-500 font-medium mb-1">{label}</p>
      <p className={`text-2xl font-bold ${alert ? 'text-[#e85d22]' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}