const roleCheck = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Your role '${req.user.role}' cannot perform this action.`
      });
    }
    next();
  };
};

module.exports = { roleCheck };