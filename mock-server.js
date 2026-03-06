// Simple mock server for UI demo
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

// CORS configuration to allow fetch from frontend
const corsOptions = {
  origin: function(origin, callback) {
    // Allow all origins for demo
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Type'],
  optionsSuccessStatus: 200,
  preflightContinue: false
};

app.use(cors(corsOptions));

// Handle preflight
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

// Mock database
const users = [
  { id: '1', name: 'Demo Admin', email: 'admin@demo.com', password_hash: 'hashed', role: 'admin' },
  { id: '2', name: 'Demo Client', email: 'client@demo.com', password_hash: 'hashed', role: 'client' },
  { id: '3', name: 'Demo Nurse', email: 'nurse@demo.com', password_hash: 'hashed', role: 'nurse' },
  { id: '4', name: 'Demo Doctor', email: 'doctor@demo.com', password_hash: 'hashed', role: 'doctor' }
];

// Mock Phase 4 login endpoint (no /api prefix - this is what the frontend calls)
app.post('/auth/phase4/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  
  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
  
  const token = 'demo-jwt-' + user.id + '-' + Date.now();
  res.cookie('accessToken', token, { httpOnly: true, secure: false, sameSite: 'lax' });
  res.cookie('refreshToken', 'demo-refresh-' + user.id, { httpOnly: true, secure: false, sameSite: 'lax' });
  
  console.log(`✅ [AUTH] Login: ${email} as ${user.role}`);
  
  res.json({
    success: true,
    data: {
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    }
  });
});

// Mock GET /auth/me
app.get('/auth/me', (req, res) => {
  const token = req.cookies.accessToken;
  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  
  const userId = token.split('-')[1];
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(401).json({ success: false, error: 'User not found' });
  }
  
  res.json({
    success: true,
    data: { user: { id: user.id, name: user.name, email: user.email, role: user.role } }
  });
});

// Mock Phase 4 login endpoint (with /api prefix - kept for compatibility)
app.post('/api/auth/phase4/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Demo: accept any password
  const token = 'demo-jwt-token-' + user.id + '-' + Date.now();
  res.cookie('accessToken', token, { httpOnly: true, secure: false, sameSite: 'lax' });
  res.cookie('refreshToken', 'demo-refresh-' + user.id, { httpOnly: true, secure: false, sameSite: 'lax' });
  
  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    }
  });
});

// Mock legacy login endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Demo: accept any password
  const token = 'demo-jwt-token-' + user.id + '-' + Date.now();
  res.cookie('accessToken', token, { httpOnly: true, secure: false, sameSite: 'lax' });
  res.cookie('refreshToken', 'demo-refresh-' + user.id, { httpOnly: true, secure: false, sameSite: 'lax' });
  
  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    }
  });
});

// Mock GET /api/auth/me
app.get('/api/auth/me', (req, res) => {
  const token = req.cookies.accessToken;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // Parse user ID from token
  const userId = token.split('-')[1];
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  
  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mock server running for UI demo' });
});

const PORT = 6005;
app.listen(PORT, () => {
  console.log(`✅ Mock server listening on http://localhost:${PORT}`);
  console.log('\n📝 Demo Credentials:');
  console.log('  Admin:  admin@demo.com (any password)');
  console.log('  Client: client@demo.com (any password)');
  console.log('  Nurse:  nurse@demo.com (any password)');
  console.log('  Doctor: doctor@demo.com (any password)');
});
