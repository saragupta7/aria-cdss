const AuditLog = require('../models/AuditLog');

const logAction = (action, resource) => {
  return async (req, res, next) => {
    
    const originalJson = res.json.bind(res);
    res.json = async (data) => {
      if (res.statusCode < 400 && req.user) {
        try {
          await AuditLog.create({
            user: req.user._id,
            action,
            resource,
            resourceId: req.params.id || null,
            details: {
              method: req.method,
              path: req.originalUrl
            },
            ipAddress: req.ip
          });
        } catch (err) {
          console.error('Audit log failed:', err.message);
        }
      }
      return originalJson(data);
    };

    next();
  };
};

module.exports = { logAction };