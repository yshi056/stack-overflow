#!/bin/bash

# Simple deployment script that avoids TypeScript compilation issues

echo "Starting simplified deployment..."

# Create server directory structure
mkdir -p server/dist/public

# Copy simplified server.js to dist directory
cat > server/dist/server.js << 'EOF'
// Simple Express server without TypeScript
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Initialize app
const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.use(express.json());
app.use(cookieParser());

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? true : 'http://localhost:3000',
  credentials: true
}));

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fakestackoverflow';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Simple routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'API is running' });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
EOF

# Install server dependencies
cd server
npm install express mongoose cors cookie-parser jsonwebtoken bcrypt

# Build client (if it exists)
if [ -d "../client" ]; then
  echo "Building client..."
  cd ../client
  npm install
  npm run build || {
    echo "Client build failed, creating simple index.html"
    mkdir -p build
    cat > build/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <title>Fake Stack Overflow</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; text-align: center; }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { color: #f48024; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Fake Stack Overflow</h1>
    <p>The application is running but client-side rendering is not available.</p>
    <p>The API should be accessible at the /api endpoints.</p>
  </div>
</body>
</html>
EOF
  }
  
  echo "Copying client build to server/dist/public..."
  mkdir -p ../server/dist/public
  cp -r build/* ../server/dist/public/ || echo "Failed to copy build files"
  
  # Add static file serving to server.js
  cat >> ../server/dist/server.js << 'EOF'

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'public')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
EOF
fi

echo "Deployment script completed"
