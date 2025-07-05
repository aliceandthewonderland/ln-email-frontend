const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Define allowed origins with environment variable support
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  // Add Vercel production domains
  ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  ...(process.env.PRODUCTION_URL ? [process.env.PRODUCTION_URL] : []),
  // Add common Vercel patterns
  'https://lnemail-client.vercel.app',
  'https://lnemail.vercel.app',
  // Allow any vercel.app subdomain in development
  ...(process.env.NODE_ENV !== 'production' ? ['https://lnemail-client-git-main-your-username.vercel.app'] : [])
];

// Enhanced CORS config for production
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, server-to-server)
    if (!origin) return callback(null, true);
    
    // In development, allow localhost variations
    if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    // Check against allowed origins
    if (allowedOrigins.includes(origin) || 
        (process.env.NODE_ENV !== 'production' && origin.includes('vercel.app'))) {
      callback(null, true);
    } else {
      // Log unauthorized origins in development only
      if (process.env.NODE_ENV !== 'production') {
        console.warn('CORS blocked origin:', origin);
      }
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Serve static files (for non-Vercel deployments)
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(path.join(__dirname)));
}

// Route for serving the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Enhanced proxy routes for LNemail API
app.use('/api/lnemail', async (req, res) => {
  const origin = req.headers.origin;
  
  // Enhanced security check
  if (origin && !allowedOrigins.includes(origin) && 
      !(process.env.NODE_ENV !== 'production' && origin.includes('vercel.app'))) {
    return res.status(403).json({ 
      error: 'Forbidden origin',
      message: 'Request from unauthorized origin'
    });
  }

  try {
    const fetch = (await import('node-fetch')).default;
    const apiPath = req.path.replace('/api/lnemail', '') || '/';
    
    const targetUrl = apiPath === '/health' 
      ? `https://lnemail.net/api${apiPath}`
      : `https://lnemail.net/api/v1${apiPath}`;
    
    // Only log in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Proxying ${req.method} ${req.path} -> ${targetUrl}`);
    }
    
    const options = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LNemail-Client/1.0',
        // Forward authorization header
        ...(req.headers.authorization && { 'Authorization': req.headers.authorization })
      },
      timeout: 10000 // 10 second timeout
    };

    // Add body for POST/PUT requests
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, options);
    
    // Handle response timeout
    if (!response.ok && response.status === 408) {
      return res.status(408).json({
        error: 'Request Timeout',
        message: 'The request to LNemail API timed out'
      });
    }
    
    const data = await response.text();
    
    // Only log in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Response: ${response.status} ${response.statusText}`);
    }
    
    // Set CORS headers
    if (allowedOrigins.includes(req.headers.origin)) {
      res.set('Access-Control-Allow-Origin', req.headers.origin);
    }

    res.set({
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true'
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
    // Enhanced error handling
    let errorMessage = 'Failed to proxy request to LNemail API';
    let statusCode = 500;
    
    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Unable to connect to LNemail API';
      statusCode = 503;
    } else if (error.name === 'AbortError') {
      errorMessage = 'Request to LNemail API timed out';
      statusCode = 408;
    }
    
    // Only log detailed errors in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('Proxy error:', error);
    }
    
    res.status(statusCode).json({ 
      error: 'Proxy Error',
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

// Enhanced OPTIONS handler
app.options('/api/lnemail*', (req, res) => {
  const origin = req.headers.origin;
  
  if (!origin || allowedOrigins.includes(origin) || 
      (process.env.NODE_ENV !== 'production' && origin.includes('vercel.app'))) {
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true'
    });
  }
  res.status(200).end();
});

// API routes (enhanced)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'LNemail Client Server is running',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Enhanced 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: 'The requested resource was not found on this server.',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  // Only log detailed errors in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', err.stack);
  }
  
  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Something went wrong on the server.' 
    : err.message;
  
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: message,
    timestamp: new Date().toISOString()
  });
});

// For local development only
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 LNemail Client Server is running on port ${PORT}`);
    console.log(`📧 Access the application at: http://localhost:${PORT}`);
    console.log(`🌐 CORS enabled for secure cross-origin requests`);
  });
}

// Export for Vercel
module.exports = app; 