const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const Alert = require('../models/Alert');
const { protect } = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');
const { logAction } = require('../middleware/auditLog');

router.use(protect);

// GET /api/patients 
// Sorted by risk (highest first)
// Used by the Ward View in the frontend
router.get('/', logAction('VIEW_ALL_PATIENTS', 'Patient'), async (req, res) => {
    try {
      const patients = await Patient
        .find({ isActive: true })   
        .select('-vitals')        
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

router.get('/:id', logAction('VIEW_PATIENT', 'Patient'), async (req, res) => {
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
      gcs: req.body.gcs
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

// PATCH /api/patients/:id/risk 
// Update a patient's ML risk score
// To be called by the Flask ML service
// It also automatically creates an alert if the risk crosses a threshold

router.patch('/:id/risk', async (req, res) => {
  try {
    const { riskScore } = req.body;
    if (riskScore === undefined || riskScore < 0 || riskScore > 1) {
      return res.status(400).json({ message: 'riskScore must be a number between 0 and 1' });
    }
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    const previousRiskLevel = patient.riskLevel;
    patient.riskScore = riskScore;
    patient.updateRiskLevel();  // sets riskLevel based on score
    await patient.save();
    // Auto-create an alert if patient became critical
    if (patient.riskLevel === 'critical' && previousRiskLevel !== 'critical') {
      await Alert.create({
        patient: patient._id,
        type: 'ml_prediction',
        message: `CRITICAL: ${patient.name} (${patient.icuBed}) has risk score ${(riskScore * 100).toFixed(0)}%. Immediate attention required.`,
        severity: 'critical'
      });
    }
    res.json({
      message: 'Risk score updated',
      patientId: patient.patientId,
      riskScore: patient.riskScore,
      riskLevel: patient.riskLevel,
      alertCreated: patient.riskLevel === 'critical' && previousRiskLevel !== 'critical'
    });
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