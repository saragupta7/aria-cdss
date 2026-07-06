require('./dns-fix');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { startEngine } = require('./services/vitalsEngine');

connectDB().then(() => seedUser());

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/admin', require('./routes/admin'));

// Health check endpoint — quick way to verify the server is running
app.get('/api/working', (req, res) => {
  res.json({
    status: 'ok',
    message: 'CDSS Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// 404 Handler — catches any routes that don't exist
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// ── Global Error Handler ───────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log('\nCDSS Backend Server');
  console.log(`Running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  
  // Start the vitals simulation engine
  startEngine();
  console.log('\nAvailable endpoints:');
  console.log('  POST /api/auth/register');
  console.log('  POST /api/auth/login');
  console.log('  GET  /api/auth/me');
  console.log('  GET  /api/patients');
  console.log('  GET  /api/patients/:id');
  console.log('  POST /api/patients');
  console.log('  POST /api/patients/:id/vitals');
  console.log('  GET  /api/alerts');
  console.log('  PATCH /api/alerts/:id/acknowledge');
  console.log('  PATCH /api/alerts/:id/resolve');
  console.log('  GET  /api/admin/stats (admin only)');
  console.log('  GET  /api/working\n');
});

const seedUser = async () => {
  const User = require('./models/User');
  // Ensure known accounts exist so every role is reachable out of the box.
  // Non-destructive: only creates accounts that are missing.
  const defaults = [
    { name: 'Admin User', email: 'admin@aria.com', password: 'CHANGEME', role: 'admin' },
    { name: 'Test Doctor', email: 'test@aria.com', password: 'CHANGEME', role: 'junior' }
  ];
  for (const acct of defaults) {
    const exists = await User.findOne({ email: acct.email });
    if (!exists) {
      await User.create(acct);
      console.log(`Seed user created: ${acct.email} / ${acct.password} (${acct.role})`);
    }
  }
};
