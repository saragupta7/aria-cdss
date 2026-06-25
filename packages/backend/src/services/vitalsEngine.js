const Patient = require('../models/Patient');
const Alert = require('../models/Alert');

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
          : { heartRate: 80, bloodPressureSystolic: 120, bloodPressureDiastolic: 80, oxygenSaturation: 98, respiratoryRate: 16, temperature: 37 };

        // Add some random noise
        const hrDelta = Math.floor(Math.random() * 7) - 3; // -3 to +3
        const sbpDelta = Math.floor(Math.random() * 5) - 2; // -2 to +2
        const o2Delta = Math.floor(Math.random() * 3) - 1; // -1 to +1

        const newHR = Math.max(40, Math.min(200, (lastVital.heartRate || 80) + hrDelta));
        const newSBP = Math.max(60, Math.min(200, (lastVital.bloodPressureSystolic || 120) + sbpDelta));
        const newDBP = Math.max(30, Math.min(120, (lastVital.bloodPressureDiastolic || 80) + Math.floor(sbpDelta / 2)));
        const newSpO2 = Math.max(70, Math.min(100, (lastVital.oxygenSaturation || 98) + o2Delta));

        const newVital = {
          timestamp: new Date(),
          heartRate: newHR,
          bloodPressureSystolic: newSBP,
          bloodPressureDiastolic: newDBP,
          oxygenSaturation: newSpO2,
          respiratoryRate: lastVital.respiratoryRate,
          temperature: lastVital.temperature
        };

        patient.vitals.push(newVital);
        if (patient.vitals.length > 50) {
          patient.vitals.shift(); // keep it small for this demo
        }

        // --- Mock ML Risk Calculation ---
        let riskScore = 0.1; // base risk 10%
        const map = (newSBP + 2 * newDBP) / 3;
        
        if (map < 65) riskScore += 0.4;
        else if (map < 70) riskScore += 0.2;
        
        if (newHR > 110) riskScore += 0.2;
        if (newSpO2 < 90) riskScore += 0.3;

        riskScore = Math.min(0.99, riskScore);
        patient.riskScore = riskScore;
        patient.riskLevel = riskScore >= 0.75 ? 'critical' : riskScore >= 0.5 ? 'high' : riskScore >= 0.2 ? 'medium' : 'low';

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
