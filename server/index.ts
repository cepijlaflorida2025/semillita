import serverless from 'serverless-http';
import app from './api/server';

// Wrap Express app for Vercel serverless deployment
// Using HTTP-based database client (neon-http) to avoid event loop blocking
export default serverless(app);