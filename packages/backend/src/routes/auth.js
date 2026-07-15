const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/auth');

const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },              // payload — data embedded in token
    process.env.JWT_SECRET,      // secret key — used to sign/verify
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

//POST /api/auth/register
// Two modes:
//   1. Self-registration (no token) — allowed ONLY if no admin exists yet.
//      This lets you bootstrap the very first admin account.
//   2. Admin-creates-user (valid admin token) — always allowed.

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Determine who is making this request
    // Try to read a token from the Authorization header (optional here)
    let requestingUser = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer')) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(
          authHeader.split(' ')[1],
          process.env.JWT_SECRET
        );
        requestingUser = await User.findById(decoded.id);
      } catch {
        
      }
    }

    if (!requestingUser || requestingUser.role !== 'admin') {
      const adminExists = await User.findOne({ role: 'admin' });
      if (adminExists) {
        return res.status(403).json({
          message: 'Registration is restricted. Ask an administrator to create your account.'
        });
      }
      req.body.role = 'admin';
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }
    const user = await User.create({
      name,
      email,
      password,
      role: req.body.role || 'junior'  
    });

    const actor = requestingUser ? requestingUser._id : user._id;
    await AuditLog.create({
      user: actor,
      action: 'REGISTER_USER',
      resource: 'User',
      resourceId: user._id,
      details: {
        createdEmail: user.email,
        assignedRole: user.role,
        registrationType: requestingUser ? 'admin_created' : 'self_bootstrap'
      },
      ipAddress: req.ip
    });
    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token: generateToken(user._id)
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

//POST /api/auth/login

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide both email and password' });
    }
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isPasswordCorrect = await user.matchPassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    await AuditLog.create({
      user: user._id,
      action: 'LOGIN',
      resource: 'Auth',
      details: { email: user.email, role: user.role }
    });
    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token: generateToken(user._id)
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

//GET /api/auth/me 
router.get('/me', protect, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }
  });
});

//PATCH /api/auth/me
// Update the logged-in user's own profile (name / email)
router.patch('/me', protect, async (req, res) => {
  try {
    const { name, email } = req.body;
    if (email && email !== req.user.email) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing && existing._id.toString() !== req.user._id.toString()) {
        return res.status(400).json({ message: 'An account with this email already exists' });
      }
      req.user.email = email;
    }
    if (name) req.user.name = name;
    await req.user.save();
    res.json({
      message: 'Profile updated',
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

//PATCH /api/auth/me/password
// Change the logged-in user's password
router.patch('/me/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new password' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    user.password = newPassword;
    await user.save();
    await AuditLog.create({
      user: user._id,
      action: 'CHANGE_PASSWORD',
      resource: 'Auth',
      details: { email: user.email }
    });
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

//POST /api/auth/change-password
// Pre-login password change: verifies email + current password (same rules
// as login), then sets the new password. Responds 401 with the same message
// for unknown email and wrong password so accounts can't be enumerated.
router.post('/change-password', async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide email, current password and new password' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    user.password = newPassword;
    await user.save();
    await AuditLog.create({
      user: user._id,
      action: 'CHANGE_PASSWORD',
      resource: 'Auth',
      details: { email: user.email, via: 'login_page' },
      ipAddress: req.ip
    });
    res.json({ message: 'Password updated successfully. You can now sign in.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

//PATCH /api/auth/users/:id/reset-password
// Admin sets a temporary password for a user (lockout recovery).
// The user can then change it themselves from the login page.
router.patch('/users/:id/reset-password', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized as admin' });
    }
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Temporary password must be at least 6 characters' });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.password = newPassword;
    await user.save();
    await AuditLog.create({
      user: req.user._id,
      action: 'ADMIN_RESET_PASSWORD',
      resource: 'User',
      resourceId: user._id,
      details: { targetEmail: user.email },
      ipAddress: req.ip
    });
    res.json({ message: `Temporary password set for ${user.email}` });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

//GET /api/auth/users
// Get all users (admin only)
router.get('/users', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized as admin' });
    }
    const users = await User.find({}).select('-password');
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});
module.exports = router;