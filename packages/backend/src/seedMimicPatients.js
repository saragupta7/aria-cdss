require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Patient = require('./models/Patient');
const Alert = require('./models/Alert');
const { getMlPrediction, mockRiskScore, riskLevelFromScore, estimateMap } = require('./services/vitalsEngine');

require('./dns-fix');

const DATA_PATH = path.join(__dirname, 'data', 'mimicPatients.json');

async function seed() {
  if (!fs.existsSync(DATA_PATH)) {
    console.error(
      `Missing ${DATA_PATH}.\n` +
      'Export demo_patients.json from the offline Colab pipeline and copy it here.'
    );
    process.exit(1);
  }

  const patients = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  // Remove the previous generation of replay patients AND their alerts —
  // otherwise the alerts are orphaned (their patient no longer exists) and
  // stay "active" forever, since the engine can never auto-resolve them.
  const replaced = await Patient.find({ dataSource: 'mimic' }).select('_id');
  await Patient.deleteMany({ dataSource: 'mimic' });
  if (replaced.length > 0) {
    const { deletedCount } = await Alert.deleteMany({ patient: { $in: replaced.map((p) => p._id) } });
    console.log(`Removed ${replaced.length} previous patients and ${deletedCount} of their alerts`);
  }

  let scoredByModel = 0;
  for (const p of patients) {
    p.dataSource = 'mimic';
    p.isActive = true;

    // Keep the full real trajectory in mimicHistory; `vitals` starts with
    // just the first reading and vitalsEngine.js reveals the rest one per
    // tick, same cadence as the simulated patients, so risk is scored
    // against what's actually been "seen" so far rather than the whole
    // stay at once.
    p.mimicHistory = p.vitals;
    p.vitals = p.mimicHistory.length > 0 ? [p.mimicHistory[0]] : [];
    p.mimicCursor = 1;

    const lastVital = p.vitals[p.vitals.length - 1] || {};
    const prediction = await getMlPrediction({ admissionDate: p.admissionDate, vitals: p.vitals });

    if (prediction) {
      p.riskScore = prediction.riskScore;
      p.riskLevel = prediction.riskLevel;
      p.riskShap = prediction.shapValues;
      scoredByModel++;
    } else {
      const score = mockRiskScore(estimateMap(lastVital), lastVital.heartRate || 80, lastVital.oxygenSaturation || 98);
      p.riskScore = score;
      p.riskLevel = riskLevelFromScore(score);
    }
  }

  await Patient.insertMany(patients);
  console.log(`Seeded ${patients.length} MIMIC-IV patients (${scoredByModel} scored by the real HemoAlert model).`);
  if (scoredByModel < patients.length) {
    console.warn('Some patients fell back to the mock risk formula — is packages/ml-service running with a model loaded?');
  }

  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
