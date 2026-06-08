const express = require('express');
const router = express.Router();
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Patient = require('../models/Patient');
const Alert = require('../models/Alert');
const { protect } = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');

router.use(protect, roleCheck('admin'));

// GET /api/admin/users
// List all users in the system

router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json({ count: users.length, users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/admin/users/:id/role
// Change a user's role 

router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['admin', 'senior', 'junior'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: `Role must be one of: ${validRoles.join(', ')}` });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }  // return the updated document
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Role updated', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/stats
// System dashboard stats (Admin Panel)

router.get('/stats', async (req, res) => {
  try {
    const [
      totalPatients,
      criticalPatients,
      activeAlerts,
      totalUsers,
      recentLogs
    ] = await Promise.all([
      Patient.countDocuments({ isActive: true }),
      Patient.countDocuments({ isActive: true, riskLevel: 'critical' }),
      Alert.countDocuments({ status: 'active' }),
      User.countDocuments({}),
      AuditLog.find({}).sort({ timestamp: -1 }).limit(20)
        .populate('user', 'name role')
    ]);
    res.json({
      stats: {
        totalPatients,
        criticalPatients,
        activeAlerts,
        totalUsers
      },
      recentActivity: recentLogs
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/audit-logs
router.get('/audit-logs', async (req, res) => {
  try {
    const logs = await AuditLog
      .find({})
      .populate('user', 'name email role')
      .sort({ timestamp: -1 })
      .limit(200);
    res.json({ count: logs.length, logs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;