// Config with environment variable fallbacks for deployment
const MONGO_URL = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/fake_so";

// For unified deployment, this should be set conditionally
const CLIENT_URL = process.env.NODE_ENV === 'production' 
  ? true  // Use same-origin in production (unified deployment)
  : "http://localhost:3000";  // Use localhost in development

// Use environment variable for port with fallback
const port = process.env.PORT || 8000;

export {
    MONGO_URL,
    CLIENT_URL,
    port
};
