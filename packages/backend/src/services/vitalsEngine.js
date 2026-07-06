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

// Ask the HemoAlert ml-service to score this patient from their vitals
// history. Returns null (rather than throwing) on any failure — timeout,
// connection refused, no model loaded (503) — so callers can fall back
// to the mock formula without the simulation tick ever crashing.
async function getMlPrediction(patient) {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        admissionDate: patient.admissionDate,
        vitalsHistory: patient.vitals
      }),
      signal: AbortSignal.timeout(ML_TIMEOUT_MS)
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // ml-service down/unreachable/timed out — fall back silently
  }
}

const startEngine = () => {
  console.log('🧪 Live Vitals Simulation Engine Started');

  // Run every 60 seconds
  setInterval(async () => {
    try {
      const activePatients = await Patient.find({ isActive: true });
      if (activePatients.length === 0) return;

      console.log(`[VitalsEngine] Simulating vitals for ${activePatients.length} active patients...`);

      for (const patient of activePatients) {
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

        // --- Risk scoring: real HemoAlert model when available, mock formula otherwise ---
        const prediction = await getMlPrediction(patient);

        if (prediction) {
          patient.riskScore = prediction.riskScore;
          patient.riskLevel = prediction.riskLevel;
          patient.riskShap = prediction.shapValues;
        } else {
          const riskScore = mockRiskScore(map, newHR, newSpO2);
          patient.riskScore = riskScore;
          patient.riskLevel = riskLevelFromScore(riskScore);
        }

        await patient.save();

        // Check if we need to alert
        if (patient.riskLevel === 'critical' || patient.riskLevel === 'high') {
          // Find if there's already an active alert for this patient
          const existingAlert = await Alert.findOne({ patient: patient._id, status: 'active' });
          if (!existingAlert) {
            await Alert.create({
              patient: patient._id,
              type: 'critical_risk',
              message: `Patient ${patient.name} has crossed critical risk threshold. MAP: ${Math.round(map)}, HR: ${newHR}`,
              severity: patient.riskLevel === 'critical' ? 'critical' : 'high'
            });
            console.log(`[VitalsEngine] 🚨 Alert triggered for ${patient.name}`);
          }
        }
      }
    } catch (err) {
      console.error('[VitalsEngine] Error during simulation tick:', err);
    }
  }, 60000); // 60 seconds
};

module.exports = { startEngine };
