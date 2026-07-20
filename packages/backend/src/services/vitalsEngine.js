const Patient = require('../models/Patient');
const Alert = require('../models/Alert');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const ML_TIMEOUT_MS = 3000;

// --- Mock ML fallback — used whenever ml-service is unreachable or has no
// model loaded yet, so the app keeps working before HemoAlert is trained.
function mockRiskScore(map, newHR, newSpO2) {
  let riskScore = 0.1;
  if (map < 65) riskScore += 0.4;
  else if (map < 70) riskScore += 0.2;

  if (newHR > 110) riskScore += 0.2;
  if (newSpO2 < 90) riskScore += 0.3;

  return Math.min(0.99, riskScore);
}

function riskLevelFromScore(score) {
  return score >= 0.8 ? 'critical' : score >= 0.6 ? 'high' : score >= 0.2 ? 'medium' : 'low';
}

// MAP from a stored vital reading (no arterial line value on hand at this
// layer — same SBP/DBP-derived estimate the training pipeline falls back to).
function estimateMap(vital) {
  if (!vital || vital.bloodPressureSystolic == null || vital.bloodPressureDiastolic == null) {
    return 75;
  }
  return (vital.bloodPressureSystolic + 2 * vital.bloodPressureDiastolic) / 3;
}

// Ask the HemoAlert ml-service to score this patient from their vitals
// history. Returns null (rather than throwing) on any failure — timeout,
// connection refused, no model loaded (503) — so callers can fall back
// to the mock formula without the simulation tick ever crashing.
async function getMlPrediction(patient) {
  try {
    // Normalize the timeline for the model: one tick = one clinical hour.
    // Stored timestamps mix wall-clock ticks (60s apart) and MIMIC's
    // de-identified 2100s dates, so present the history as hourly readings
    // ending now — the cadence the model was trained on.
    const HOUR = 3600 * 1000;
    const now = Date.now();
    const n = patient.vitals.length;
    const vitalsHistory = patient.vitals.map((v, i) => {
      const plain = typeof v.toObject === 'function' ? v.toObject() : { ...v };
      return { ...plain, timestamp: new Date(now - (n - 1 - i) * HOUR) };
    });
    // Hours in ICU: replay cursor for MIMIC stays (their real elapsed stay),
    // otherwise at least the visible window.
    const hoursInIcu = patient.dataSource === 'mimic' && patient.mimicCursor > 0
      ? patient.mimicCursor + 1
      : n + 1;

    const res = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        admissionDate: new Date(now - hoursInIcu * HOUR),
        vitalsHistory
      }),
      signal: AbortSignal.timeout(ML_TIMEOUT_MS)
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // ml-service down/unreachable/timed out — fall back silently
  }
}

// Shared by both the synthetic and MIMIC-replay tick paths: score the
// patient's current `vitals` (real model if available, mock formula
// otherwise), persist, and raise an alert on a fresh high/critical crossing.
async function scoreAndAlert(patient, map, hr) {
  const latest = patient.vitals[patient.vitals.length - 1];
  const prediction = await getMlPrediction(patient);

  if (prediction) {
    patient.riskScore = prediction.riskScore;
    patient.riskLevel = prediction.riskLevel;
    patient.riskShap = prediction.shapValues;
    patient.riskSource = 'model';
  } else {
    const riskScore = mockRiskScore(map, hr, latest?.oxygenSaturation ?? 98);
    patient.riskScore = riskScore;
    patient.riskLevel = riskLevelFromScore(riskScore);
    // Drop any SHAP left over from a previous model-scored tick — it explains
    // a score this tick just replaced, and keeping it would make the frontend
    // label a heuristic score 'HemoAlert model'.
    patient.riskShap = [];
    patient.riskSource = 'heuristic';
  }

  await patient.save();

  if (patient.riskLevel === 'critical' || patient.riskLevel === 'high') {
    const existingAlert = await Alert.findOne({ patient: patient._id, status: 'active' });
    if (!existingAlert) {
      await Alert.create({
        patient: patient._id,
        type: 'critical_risk',
        message: `Patient ${patient.name} has crossed critical risk threshold. MAP: ${Math.round(map)}, HR: ${Math.round(hr)}`,
        severity: patient.riskLevel === 'critical' ? 'critical' : 'high'
      });
      console.log(`[VitalsEngine] Alert triggered for ${patient.name}`);
    }
  } else if (patient.riskLevel === 'low') {
    // Patient recovered — auto-resolve their open alerts so the alert
    // stream reflects reality and a future crossing raises a fresh alert.
    const res = await Alert.updateMany(
      { patient: patient._id, status: { $in: ['active', 'acknowledged'] } },
      { status: 'resolved', resolvedAt: new Date() }
    );
    if (res.modifiedCount > 0) {
      console.log(`[VitalsEngine] Auto-resolved ${res.modifiedCount} alert(s) for recovered ${patient.name}`);
    }
  }
}

async function tickSimulatedPatient(patient) {
  // Grab the last vital or generate base
  const lastVital = patient.vitals.length > 0
    ? patient.vitals[patient.vitals.length - 1]
    : {
        heartRate: 80, bloodPressureSystolic: 120, bloodPressureDiastolic: 80,
        oxygenSaturation: 98, respiratoryRate: 16, temperature: 37,
        creatinine: 1.0, bicarbonate: 24, bun: 14, vasopressorOn: false
      };

  // Add some random noise
  const hrDelta = Math.floor(Math.random() * 7) - 3; // -3 to +3
  const sbpDelta = Math.floor(Math.random() * 5) - 2; // -2 to +2
  const o2Delta = Math.floor(Math.random() * 3) - 1; // -1 to +1

  const newHR = Math.max(40, Math.min(200, (lastVital.heartRate || 80) + hrDelta));
  const newSBP = Math.max(60, Math.min(200, (lastVital.bloodPressureSystolic || 120) + sbpDelta));
  const newDBP = Math.max(30, Math.min(120, (lastVital.bloodPressureDiastolic || 80) + Math.floor(sbpDelta / 2)));
  const newSpO2 = Math.max(70, Math.min(100, (lastVital.oxygenSaturation || 98) + o2Delta));
  const map = (newSBP + 2 * newDBP) / 3;

  // Labs drift slowly — these aren't resampled every tick in real ICUs
  const newCreatinine = Math.max(0.4, (lastVital.creatinine ?? 1.0) + (Math.random() * 0.1 - 0.05));
  const newBicarbonate = Math.max(10, Math.min(32, (lastVital.bicarbonate ?? 24) + (Math.random() * 0.8 - 0.4)));
  const newBun = Math.max(5, (lastVital.bun ?? 14) + (Math.random() * 1.2 - 0.5));

  // Vasopressor: start when hemodynamics are failing, wean once MAP recovers
  let vasopressorOn = !!lastVital.vasopressorOn;
  let vasopressorAgent = lastVital.vasopressorAgent || null;
  if (!vasopressorOn && map < 65 && Math.random() < 0.35) {
    vasopressorOn = true;
    vasopressorAgent = 'norepinephrine';
  } else if (vasopressorOn && map > 75 && Math.random() < 0.4) {
    vasopressorOn = false;
    vasopressorAgent = null;
  }

  const newVital = {
    timestamp: new Date(),
    heartRate: newHR,
    bloodPressureSystolic: newSBP,
    bloodPressureDiastolic: newDBP,
    oxygenSaturation: newSpO2,
    respiratoryRate: lastVital.respiratoryRate,
    temperature: lastVital.temperature,
    creatinine: newCreatinine,
    bicarbonate: newBicarbonate,
    bun: newBun,
    vasopressorOn,
    vasopressorAgent
  };

  patient.vitals.push(newVital);
  if (patient.vitals.length > 50) {
    patient.vitals.shift(); // keep it small for this demo
  }

  await scoreAndAlert(patient, map, newHR);
}

async function tickMimicPatient(patient) {
  if (!patient.mimicHistory || patient.mimicHistory.length === 0) return;

  // Real history exhausted — loop back and replay from the start rather
  // than switching to synthetic data or freezing.
  if (patient.mimicCursor >= patient.mimicHistory.length) {
    patient.mimicCursor = 0;
  }

  const nextReading = patient.mimicHistory[patient.mimicCursor].toObject();
  delete nextReading._id; // avoid reusing the mimicHistory subdoc's _id on a distinct vitals entry
  // Reveal onto the live timeline: the values are real MIMIC data, but the
  // reading appears "now" (the original timestamps are de-identified 2100s
  // dates, which froze every chart clock).
  nextReading.timestamp = new Date();
  patient.mimicCursor += 1;

  patient.vitals.push(nextReading);
  if (patient.vitals.length > 50) {
    patient.vitals.shift();
  }

  const latest = patient.vitals[patient.vitals.length - 1];
  await scoreAndAlert(patient, estimateMap(latest), latest.heartRate || 80);
}

const startEngine = () => {
  console.log('Live Vitals Simulation Engine Started');

  // Run every 60 seconds. `ticking` guards against overlap: a slow tick
  // (e.g. ml-service near its timeout for many patients) must not race a
  // second copy of the same patient documents into VersionErrors.
  let ticking = false;
  setInterval(async () => {
    if (ticking) {
      console.warn('[VitalsEngine] Previous tick still running — skipping this interval');
      return;
    }
    ticking = true;
    try {
      const activePatients = await Patient.find({ isActive: true });
      if (activePatients.length === 0) return;

      console.log(`[VitalsEngine] Ticking vitals for ${activePatients.length} active patients...`);

      for (const patient of activePatients) {
        try {
          if (patient.dataSource === 'mimic') {
            await tickMimicPatient(patient);
          } else {
            await tickSimulatedPatient(patient);
          }
        } catch (err) {
          // One patient failing must not abort the rest of the tick
          console.error(`[VitalsEngine] Tick failed for ${patient.name}: ${err.message}`);
        }
      }
    } catch (err) {
      console.error('[VitalsEngine] Error during simulation tick:', err);
    } finally {
      ticking = false;
    }
  }, 60000); // 60 seconds
};

module.exports = { startEngine, getMlPrediction, mockRiskScore, riskLevelFromScore, estimateMap };
