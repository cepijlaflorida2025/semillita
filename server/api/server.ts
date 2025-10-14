import express from 'express';
import { registerRoutes } from '../routes.js';
import { setupVite, log } from '../vite.js';

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Track route registration state
let routesRegistered = false;
let routeRegistrationPromise: Promise<void> | null = null;

/**
 * Ensure routes are registered before handling requests
 * Uses singleton pattern with promise caching for thread safety
 */
async function ensureRoutesRegistered() {
  if (routesRegistered) {
    return; // Already done
  }

  if (routeRegistrationPromise) {
    // Already in progress, wait for it
    await routeRegistrationPromise;
    return;
  }

  // Start registration
  routeRegistrationPromise = (async () => {
    try {
      console.log('🔧 [Serverless] Registering routes on first request...');
      await registerRoutes(app);
      routesRegistered = true;
      console.log('✅ [Serverless] Routes registered successfully');
    } catch (error) {
      console.error('❌ [Serverless] Failed to register routes:', error);
      routeRegistrationPromise = null; // Allow retry
      throw error;
    }
  })();

  await routeRegistrationPromise;
}

// For development: start the integrated server
if (process.env.NODE_ENV !== 'production') {
  async function startDevServer() {
    try {
      // Register API routes and get HTTP server
      const httpServer = await registerRoutes(app);
      routesRegistered = true;

      // Setup Vite middleware for development
      await setupVite(app, httpServer);
      log('Vite middleware configured');

      // Start server on port 5000
      const PORT = parseInt(process.env.PORT || '5000', 10);
      httpServer.listen(PORT, '0.0.0.0', () => {
        log(`Development server running on http://0.0.0.0:${PORT}`);
      });
    } catch (error) {
      console.error('Error starting development server:', error);
      process.exit(1);
    }
  }

  startDevServer();
} else {
  // For production/serverless: use lazy registration middleware
  // Routes will be registered on first request
  console.log('🔧 [Production] Using lazy route registration (first request)');

  // Add middleware to ensure routes are registered before handling any request
  app.use(async (req, res, next) => {
    if (!routesRegistered) {
      try {
        await ensureRoutesRegistered();
      } catch (error) {
        console.error('❌ Failed to register routes:', error);
        return res.status(500).json({ message: 'Server initialization error' });
      }
    }
    next();
  });
}

export default app;
