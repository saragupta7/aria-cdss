const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const { protect } = require('../middleware/auth');
const { logAction } = require('../middleware/auditLog');

router.use(protect);

// GET /api/alerts
// Get all active alerts — used in the alert panel of the frontend
// .populate() replaces the patient ObjectId with actual patient data

router.get('/', async (req, res) => {
  try {
    const { status, patient } = req.query;  // ?status=active|resolved|all, ?patient=<id>
    const filter = {};
    // status=all (or an explicit patient query) returns every status; otherwise default to active
    if (status && status !== 'all') {
      filter.status = status;
    } else if (!status && !patient) {
      filter.status = 'active';  // default: only show active alerts
    }
    if (patient) {
      filter.patient = patient;
    }
    const alerts = await Alert
      .find(filter)
      .populate('patient', 'name icuBed patientId')
      .populate('acknowledgedBy', 'name role')
      .populate('resolvedBy', 'name role')
      .sort({ createdAt: -1 });

    res.json({ count: alerts.length, alerts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/alerts
// Manually create an alert

router.post('/', async (req, res) => {
  try {
    const { patient, type, message, severity } = req.body;

    const alert = await Alert.create({ patient, type, message, severity });
    
    await alert.populate('patient', 'name icuBed patientId');

    res.status(201).json({
      message: 'Alert created',
      alert
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/alerts/:id/acknowledge
// Clinician acknowledges they've seen the alert

router.patch('/:id/acknowledge', logAction('ACKNOWLEDGE_ALERT', 'Alert'), async (req, res) => {
    try {
      const alert = await Alert.findById(req.params.id);
      if (!alert) {
        return res.status(404).json({ message: 'Alert not found' });
      }
      if (alert.status !== 'active') {
        return res.status(400).json({
          message: `Alert is already ${alert.status}.`
        });
      }
      alert.status = 'acknowledged';
      alert.acknowledgedBy = req.user._id;
      alert.acknowledgedAt = new Date();
      await alert.save();
      res.json({ message: 'Alert acknowledged', alert });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// PATCH /api/alerts/:id/resolve 
// Clinician marks alert as resolved (patient stabilised or intervention made)

router.patch('/:id/resolve', logAction('RESOLVE_ALERT', 'Alert'), async (req, res) => {
    try {
      const alert = await Alert.findById(req.params.id);
      if (!alert) {
        return res.status(404).json({ message: 'Alert not found' });
      }
      if (alert.status === 'resolved') {
        return res.status(400).json({ message: 'Alert is already resolved' });
      }
      alert.status = 'resolved';
      alert.resolvedBy = req.user._id;
      alert.resolvedAt = new Date();
      await alert.save();
      res.json({ message: 'Alert resolved', alert });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// GET /api/alerts/audit
// Get all alerts including resolved ones — for admin dashboard

router.get('/audit', async (req, res) => {
  try {
    const alerts = await Alert
      .find({})
      .populate('patient', 'name icuBed patientId')
      .populate('acknowledgedBy', 'name role')
      .populate('resolvedBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(100);  // last 100 alerts

    res.json({ count: alerts.length, alerts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;