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

  resourceId: String, // Changed to String to support both ObjectIds and custom string IDs like 'PT-0047'

  details: mongoose.Schema.Types.Mixed,

  ipAddress: String,

  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);