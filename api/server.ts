import express from 'express';
import { registerRoutes } from '../server/routes.js';

console.log('🚀 Initializing Express app...');
const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

// Health check
app.get('/api/health', (_, res) => res.status(200).json({ status: 'ok' }));

registerRoutes(app); // Call but don't await - routes register immediately

console.log('✅ [Vercel] Routes registered, exporting handler...');

// Export immediately - routes are already in the app
export default function handler(req, res) {
  return app(req, res);
}