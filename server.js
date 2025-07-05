const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Define allowed origins in one place
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  // production domain
];

// Update main CORS config
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, server-to-server)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname)));

// Route for serving the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Proxy routes for LNemail API
app.use('/api/lnemail', async (req, res) => {
  const origin = req.headers.origin;
  
  // Only allow auth headers from trusted origins
  if (origin && !allowedOrigins.includes(origin)) {
    delete req.headers.authorization;
    return res.status(403).json({ error: 'Forbidden origin' });
  }

  try {
    const fetch = (await import('node-fetch')).default;
    const apiPath = req.path.replace('/api/lnemail', '') || '/';
    
    const targetUrl = apiPath === '/health' 
      ? `https://lnemail.net/api${apiPath}`
      : `https://lnemail.net/api/v1${apiPath}`;
    
    console.log(`Proxying ${req.method} ${req.path} -> ${targetUrl}`);
    
    const options = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        // Forward authorization header
        ...(req.headers.authorization && { 'Authorization': req.headers.authorization }),
        // Forward other relevant headers but exclude problematic ones
        ...(req.headers['user-agent'] && { 'User-Agent': req.headers['user-agent'] })
      }
    };

    // Add body for POST/PUT requests
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, options);
    const data = await response.text();
    
    console.log(`Response: ${response.status} ${response.statusText}`);
    
    if (allowedOrigins.includes(req.headers.origin)) {
      res.set('Access-Control-Allow-Origin', req.headers.origin);
    }

    res.set({
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    });

    res.status(response.status);
    
    // Try to parse as JSON, fallback to text
    try {
      const jsonData = JSON.parse(data);
      res.json(jsonData);
    } catch {
      res.send(data);
    }
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy Error',
      message: 'Failed to proxy request to LNemail API',
      details: error.message
    });
  }
});

// Update OPTIONS handler
app.options('/api/lnemail*', (req, res) => {
  const origin = req.headers.origin;
  
  if (!origin || allowedOrigins.includes(origin)) {
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    });
  }
  res.status(200).end();
});

// API routes (if needed for future enhancements)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'LNemail Client Server is running',
    timestamp: new Date().toISOString()
  });
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: 'The requested resource was not found on this server.'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: 'Something went wrong on the server.'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 LNemail Client Server is running on port ${PORT}`);
  console.log(`📧 Access the application at: http://localhost:${PORT}`);
  console.log(`🌐 CORS enabled for secure cross-origin requests`);
}); 