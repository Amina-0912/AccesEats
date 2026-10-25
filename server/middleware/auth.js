const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ success: false, error: 'Invalid or expired token.' });
  }
};

// Fixed middleware for direct admin checks
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    error: 'Access denied. Admin privileges required.'
  });
};

// Dynamic role middleware (used in index.js for requireRole('admin'))
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (req.user && req.user.role === requiredRole) {
      return next();
    }
    return res.status(403).json({
      success: false,
      error: `Access denied. ${requiredRole} privileges required.`
    });
  };
};

module.exports = { verifyToken, isAdmin, requireRole };