const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const { protect } = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');
const { logAction } = require('../middleware/auditLog');
const { getMlPrediction } = require('../services/vitalsEngine');

router.use(protect);

// POST /api/patients/sandbox/predict
// Score a hypothetical patient built from the Training Sandbox sliders with
// the real HemoAlert model. Returns { source: 'model', ... } on success, or
// { source: 'heuristic' } when ml-service is down/unloaded so the frontend
// knows to fall back to its local formula (and label the output accordingly).
router.post('/sandbox/predict', async (req, res) => {
  try {
    const {
      mapNow, map1h, map3h, hr, spo2, rr,
      lactate, creatinine, sbp, dbp, vasopressor
    } = req.body;

    // The model consumes SBP/DBP (MAP is derived in features.py). The
    // sandbox exposes MAP sliders for history, so back-derive plausible
    // SBP/DBP pairs holding the current pulse pressure constant:
    // MAP = DBP + PP/3  =>  DBP = MAP - PP/3.
    const pp = Math.max(10, (sbp ?? 120) - (dbp ?? 80));
    const bpFromMap = (map) => {
      const d = map - pp / 3;
      return { bloodPressureSystolic: d + pp, bloodPressureDiastolic: d };
    };

    const now = Date.now();
    const HOUR = 3600 * 1000;
    const base = {
      heartRate: hr,
      respiratoryRate: rr,
      oxygenSaturation: spo2,
      lactate,
      creatinine,
      vasopressorOn: !!vasopressor
    };
    // 4 hourly timesteps: 3h ago, 2h ago (interpolated), 1h ago, now —
    // enough history for the slope/rolling features to be meaningful.
    const vitalsHistory = [
      { ...base, timestamp: new Date(now - 3 * HOUR).toISOString(), ...bpFromMap(map3h) },
      { ...base, timestamp: new Date(now - 2 * HOUR).toISOString(), ...bpFromMap((map3h + map1h) / 2) },
      { ...base, timestamp: new Date(now - 1 * HOUR).toISOString(), ...bpFromMap(map1h) },
      { ...base, timestamp: new Date(now).toISOString(), bloodPressureSystolic: sbp, bloodPressureDiastolic: dbp }
    ];

    const prediction = await getMlPrediction({
      admissionDate: new Date(now - 24 * HOUR),
      vitals: vitalsHistory
    });

    if (!prediction) {
      return res.json({ source: 'heuristic' });
    }
    res.json({ source: 'model', ...prediction });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/patients 
// Sorted by risk (highest first)
// Used by the Ward View in the frontend
router.get('/', async (req, res) => {
    try {
      const patients = await Patient
        .find({ isActive: true })
        .select('-vitals -mimicHistory') // mimicHistory is the unrevealed future trajectory — server-side only
        .sort({ riskScore: -1 });
      res.json({
        count: patients.length,
        patients
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);
// GET /api/patients/:id
// Get one patient with FULL vitals history
// Used by the Patient Detail view in the frontend

router.get('/:id', async (req, res) => {
    try {
      const mongoose = require('mongoose');
      let patient;
      if (mongoose.Types.ObjectId.isValid(req.params.id)) {
        patient = await Patient.findById(req.params.id);
      }
      if (!patient) {
        patient = await Patient.findOne({ patientId: req.params.id });
      }
      if (!patient) {
        return res.status(404).json({ message: 'Patient not found' });
      }
      const patientData = patient.toObject();
      // last 24 hours vitals (consifering gap of 30 minutes between each reading )
      patientData.vitals = patientData.vitals.slice(-48);
      // Unrevealed future readings for MIMIC replay patients — never sent to clients
      delete patientData.mimicHistory;
      res.json({ patient: patientData });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);
// POST /api/patients 
// Admit a new patient to the ICU
// Only senior clinicians and admins can admit patients
router.post('/', roleCheck('admin', 'senior'), async (req, res) => {
    try {
      const { patientId, name, age, gender, icuBed, ward, diagnosis } = req.body;
      const bedOccupied = await Patient.findOne({ icuBed, isActive: true });
      if (bedOccupied) {
        return res.status(400).json({
          message: `Bed ${icuBed} is already occupied by ${bedOccupied.name}`
        });
      }
      const patient = await Patient.create({
        patientId,
        name,
        age,
        gender,
        icuBed,
        ward,
        diagnosis,
        vitals: []
      });
      res.status(201).json({
        message: 'Patient admitted to ICU',
        patient
      });
    } catch (error) {
      if (error.code === 11000) {
        // MongoDB duplicate key error (patientId already exists)
        return res.status(400).json({ message: 'Patient ID already exists' });
      }
      res.status(500).json({ message: error.message });
    }
  }
);

// POST /api/patients/:id/vitals 
// Record a new vitals reading for a patient
// This will be called every 30 minutes by monitoring equipment (or simulated in Phase 4)

router.post('/:id/vitals', async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    const newVital = {
      timestamp: new Date(),
      heartRate: req.body.heartRate,
      bloodPressureSystolic: req.body.bloodPressureSystolic,
      bloodPressureDiastolic: req.body.bloodPressureDiastolic,
      temperature: req.body.temperature,
      respiratoryRate: req.body.respiratoryRate,
      oxygenSaturation: req.body.oxygenSaturation,
      lactate: req.body.lactate,
      creatinine: req.body.creatinine,
      bicarbonate: req.body.bicarbonate,
      bun: req.body.bun,
      vasopressorOn: req.body.vasopressorOn,
      vasopressorAgent: req.body.vasopressorAgent
    };
    // Add new reading to the vitals array
    patient.vitals.push(newVital);
    // Cap at 500 readings to prevent the document growing too large
    // (MongoDB has a 16MB document limit)
    if (patient.vitals.length > 500) {
      patient.vitals = patient.vitals.slice(-500);
    }
    await patient.save();
    res.json({
      message: 'Vitals recorded successfully',
      latestVitals: newVital,
      totalReadings: patient.vitals.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/patients/:id/notes
// Clinical notes for a patient (most recent first)
router.get('/:id/notes', async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).select('notes');
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    const notes = [...(patient.notes || [])].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    res.json({ count: notes.length, notes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/patients/:id/notes
// Add a clinical note (attributed to the logged-in clinician)
router.post('/:id/notes', logAction('ADD_NOTE', 'Patient'), async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Note text is required' });
    }
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    const note = {
      text: text.trim(),
      authorName: req.user.name,
      authorRole: req.user.role,
      author: req.user._id,
      createdAt: new Date()
    };
    patient.notes.push(note);
    await patient.save();
    res.status(201).json({ message: 'Note added', note });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/patients/:id
// Only admins can discharge patients

router.delete('/:id', roleCheck('admin'), logAction('DISCHARGE_PATIENT', 'Patient'), async (req, res) => {
    try {
      const patient = await Patient.findById(req.params.id);
      if (!patient) {
        return res.status(404).json({ message: 'Patient not found' });
      }
      patient.isActive = false; 
      await patient.save();
      res.json({ message: `${patient.name} has been discharged from ICU` });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;