const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // What they did
  // Examples: 'LOGIN', 'VIEW_PATIENT', 'ACKNOWLEDGE_ALERT', 'UPDATE_VITALS'
  action: {
    type: String,
    required: true
  },

  // What type of thing was affected
  resource: String,   // e.g. 'Patient', 'Alert'

  resourceId: mongoose.Schema.Types.ObjectId,

  details: mongoose.Schema.Types.Mixed,

  ipAddress: String,

  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);