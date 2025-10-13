const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ 
    message: '🇪🇹 Tax Clearance System API is running!',
    timestamp: new Date().toISOString(),
    status: 'Active'
  });
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    service: 'Tax Clearance Backend',
    time: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
});