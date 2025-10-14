import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { db } from "./db.js";
import { insertUserSchema, insertPlantSchema, insertJournalEntrySchema, insertSeedSchema, emotions, achievements, rewards, users } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import multer from "multer";
import { z } from "zod";
import { randomBytes } from "crypto";
import { uploadToSupabase, saveProfileHistory, getProfileHistory } from "./supabase.js";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images and audio files are allowed'));
    }
  },
});

// Helper function to generate share codes
function generateShareCode(): string {
  return randomBytes(8).toString('hex').toUpperCase();
}

// Mock file storage (fallback for when Supabase is not configured)
const mockFileStorage = new Map<string, Buffer>();

async function saveFile(
  buffer: Buffer,
  mimetype: string,
  userId?: string,
  type?: 'plant' | 'journal_entry' | 'seed' | 'avatar',
  plantId?: string
): Promise<string> {
  const id = randomBytes(16).toString('hex');
  const extension = mimetype.split('/')[1];
  const filename = `${userId || 'anonymous'}/${Date.now()}_${id}.${extension}`;

  try {
    // Try to upload to Supabase first
    const publicUrl = await uploadToSupabase(buffer, filename, mimetype);

    // Save to history if userId is provided
    if (userId && type) {
      await saveProfileHistory({
        userId,
        photoUrl: publicUrl,
        plantId,
        type,
        metadata: {
          filename,
          mimetype,
          size: buffer.length,
        },
      });
    }

    return publicUrl;
  } catch (error) {
    // Fallback to local storage if Supabase fails
    console.warn('Supabase upload failed, using local storage:', error);
    mockFileStorage.set(filename, buffer);
    return `/uploads/${filename}`;
  }
}

// COPPA Compliance Middleware - Critical security protection
async function enforceConsentMiddleware(req: any, res: any, next: any) {
  // Only enforce on data collection endpoints (POST, PATCH, PUT)
  if (!['POST', 'PATCH', 'PUT'].includes(req.method)) {
    return next();
  }

  // Skip enforcement for consent-related endpoints themselves
  const exemptPaths = [
    '/api/users', // Initial user creation
    '/api/verify-consent', // Consent verification
    '/api/resend-consent-email' // Consent email resend
  ];
  
  if (exemptPaths.includes(req.path)) {
    return next();
  }

  // Extract userId from request body or params
  const userId = req.body?.userId || req.params?.userId || req.body?.id || req.params?.id;
  
  if (!userId) {
    // If no userId can be determined, skip enforcement (API will handle validation)
    return next();
  }

  try {
    // Fetch user from database to verify current consent status
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND' 
      });
    }

    // CRITICAL: Block data collection from children without consent
    // Allow if: (1) consentVerified is true OR (2) parentalConsent is true (terms accepted)
    if (user.role === 'child' && !user.consentVerified && !user.parentalConsent) {
      console.warn(`COPPA VIOLATION BLOCKED: Attempted data collection from unverified child user ${userId} on ${req.method} ${req.path}`);

      return res.status(403).json({
        message: 'Parental consent required',
        code: 'CONSENT_REQUIRED',
        details: 'Children cannot use data collection features without parental consent',
        action: 'redirect_to_consent'
      });
    }

    // Log when using parentalConsent (terms acceptance) instead of full verification
    if (user.role === 'child' && !user.consentVerified && user.parentalConsent) {
      console.log(`✅ Child user ${userId} allowed with parentalConsent (terms accepted) on ${req.method} ${req.path}`);
    }

    // User is verified or not a child - proceed
    next();
  } catch (error) {
    console.error('Error in COPPA consent middleware:', error);
    return res.status(500).json({ 
      message: 'Server error during consent verification',
      code: 'CONSENT_CHECK_ERROR'
    });
  }
}

// COPPA-aware multipart middleware - checks consent AFTER multer processes files
function createMultipartConsentMiddleware(multerMiddleware: any) {
  return (req: any, res: any, next: any) => {
    // First let multer process the request
    multerMiddleware(req, res, (multerError: any) => {
      if (multerError) {
        return res.status(400).json({ message: 'File upload error', error: multerError.message });
      }
      
      // Now apply COPPA consent check with processed req.body
      enforceConsentMiddleware(req, res, next);
    });
  };
}

// Track if default data has been initialized (in-memory flag for this instance)
let defaultDataInitialized = false;
let initializationPromise: Promise<void> | null = null;

// Lazy initialization - only runs once per instance, on first request
// Returns immediately if already initializing (non-blocking for faster response)
async function ensureDefaultData() {
  if (defaultDataInitialized) {
    return; // Already initialized
  }

  // If initialization is already in progress, DON'T WAIT (non-blocking)
  if (initializationPromise) {
    return; // Return immediately, let it initialize in background
  }

  // Start initialization in background (non-blocking)
  initializationPromise = (async () => {
    try {
      console.log('⏳ Initializing default data in background...');
      await Promise.all([
        initializeDefaultEmotions(),
        initializeDefaultAchievements(),
        initializeDefaultRewards()
      ]);
      defaultDataInitialized = true;
      console.log('✅ Default data initialized successfully');
    } catch (error) {
      console.error('❌ Error during default data initialization:', error);
      // Reset promise so it can be retried
      initializationPromise = null;
    }
  })();

  // DON'T WAIT for initialization - return immediately
  return;
}

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('🚀 Starting route initialization...');

  // Serve uploaded files
  app.get('/uploads/:filename', (req, res) => {
    const file = mockFileStorage.get(req.params.filename);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    res.send(file);
  });

  // User routes
  app.post('/api/users', async (req, res) => {
    const requestStart = Date.now();
    console.log(`📥 [POST /api/users] Request started at ${new Date().toISOString()}`);

    try {
      console.log('📝 [POST /api/users] Creating user with data:', { ...req.body, parentEmail: req.body.parentEmail ? '***' : undefined });

      // Validate with shared schema
      const userData = insertUserSchema.parse(req.body);
      console.log('✅ [POST /api/users] User data validated successfully');

      console.log('🔗 [POST /api/users] About to insert user into database...');
      const dbStart = Date.now();
      const user = await storage.createUser(userData);
      const dbDuration = Date.now() - dbStart;
      console.log(`✅ [POST /api/users] User created successfully in ${dbDuration}ms:`, user.id);

      // Automatically create a plant for the user
      try {
        console.log('🌱 [POST /api/users] Creating plant for user...');
        const plant = await storage.createPlant({
          userId: user.id,
          name: 'Mi Plantita',
          type: 'seedling',
          status: 'growing',
          isActive: true
        });
        console.log('✅ [POST /api/users] Plant created automatically for user:', user.id, 'Plant ID:', plant.id);
      } catch (plantError) {
        console.error('⚠️ [POST /api/users] Could not create plant for user:', plantError);
        // Don't fail user creation if plant creation fails
      }

      const totalDuration = Date.now() - requestStart;
      console.log(`✅ [POST /api/users] Request completed in ${totalDuration}ms total`);
      res.json(user);
    } catch (error) {
      const totalDuration = Date.now() - requestStart;
      console.error(`❌ [POST /api/users] Error after ${totalDuration}ms:`, error);

      if (error instanceof z.ZodError) {
        console.error('❌ [POST /api/users] Validation errors:', error.errors);
        return res.status(400).json({
          message: 'Invalid user data',
          errors: error.errors
        });
      }

      // Return more detailed error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ [POST /api/users] Error stack:`, error instanceof Error ? error.stack : 'No stack');
      res.status(500).json({
        message: 'Error creating user',
        error: errorMessage
      });
    }
  });

  // COPPA Compliance endpoints
  app.post('/api/verify-consent', async (req, res) => {
    try {
      const { verificationCode, userId } = req.body;
      
      if (!verificationCode || typeof verificationCode !== 'string') {
        return res.status(400).json({ message: 'Verification code required' });
      }
      
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ message: 'User ID required' });
      }
      
      // Simple verification logic for MVP (in production, use secure tokens)
      const isValidCode = verificationCode.toUpperCase() === 'APPROVED';
      
      if (isValidCode) {
        // Find and update the actual user record
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }
        
        if (user.role !== 'child') {
          return res.status(400).json({ message: 'Consent verification only required for children' });
        }
        
        // Update user consent status in database
        const updatedUser = await storage.updateUserConsent(userId, true);
        
        console.log(`COPPA CONSENT VERIFIED: User ${userId} (${user.alias}) has verified parental consent`);
        
        res.json(updatedUser);
      } else {
        res.status(400).json({ message: 'Invalid verification code' });
      }
    } catch (error) {
      console.error('Error verifying consent:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/resend-consent-email', async (req, res) => {
    try {
      // In production, this would trigger an actual email send
      // For MVP, just return success
      res.json({ message: 'Consent email resent successfully' });
    } catch (error) {
      console.error('Error resending consent email:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get user by alias (for login) - CRITICAL: Must be fast for serverless
  app.get('/api/users', async (req, res) => {
    const requestStart = Date.now();
    console.log(`📥 [GET /api/users] Request started at ${new Date().toISOString()}`);

    try {
      const alias = req.query.alias as string;
      if (!alias) {
        console.log(`⚠️ [GET /api/users] Missing alias parameter`);
        return res.status(400).json({ message: 'Alias query parameter is required' });
      }

      console.log(`🔍 [LOGIN] Searching for user with alias: ${alias}`);
      console.log(`🔗 [LOGIN] About to query database...`);
      const dbStart = Date.now();

      const user = await storage.getUserByAlias(alias);

      const dbDuration = Date.now() - dbStart;
      console.log(`📊 [LOGIN] DB query completed in ${dbDuration}ms`);

      if (!user) {
        console.log(`⚠️ [LOGIN] User not found: ${alias}`);
        return res.json([]); // Return empty array if user not found (matches client expectation)
      }

      const totalDuration = Date.now() - requestStart;
      console.log(`✅ [LOGIN] User found in ${totalDuration}ms total`);
      res.json([user]); // Return array with single user (matches client expectation)
    } catch (error) {
      const totalDuration = Date.now() - requestStart;
      console.error(`❌ [LOGIN] Error after ${totalDuration}ms:`, error);
      console.error(`❌ [LOGIN] Error stack:`, error instanceof Error ? error.stack : 'No stack');
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/users/:id', async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Dashboard endpoint - aggregates all user data
  app.get('/api/dashboard/:userId', async (req, res) => {
    try {
      const userId = req.params.userId;

      // Ensure default data is initialized before fetching
      await ensureDefaultData();

      // Fetch all dashboard data in parallel
      const [user, plant, latestEntry, userAchievements, allAchievements, seeds, journalEntries] = await Promise.all([
        storage.getUser(userId),
        storage.getActivePlant(userId),
        storage.getLatestJournalEntry(userId),
        storage.getUserAchievements(userId),
        storage.getAllAchievements(),
        storage.getUserSeeds(userId),
        storage.getUserJournalEntries(userId, 1000), // Get all entries to count them
      ]);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Add journal entries count to user data
      const userWithCount = {
        ...user,
        journalEntriesCount: journalEntries.length,
      };

      // Map achievements with earned status
      const earnedIds = new Set(userAchievements.map(ua => ua.achievementId));
      const achievementsWithStatus = allAchievements.map(achievement => ({
        ...achievement,
        earned: earnedIds.has(achievement.id),
        earnedAt: userAchievements.find(ua => ua.achievementId === achievement.id)?.earnedAt,
      }));

      res.json({
        user: userWithCount,
        plant,
        latestEntry,
        achievements: achievementsWithStatus,
        seeds,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Plant routes with COPPA protection for data collection
  app.get('/api/users/:userId/plant', async (req, res) => {
    try {
      const plant = await storage.getActivePlant(req.params.userId);
      res.json(plant);
    } catch (error) {
      console.error('Error fetching plant:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/plants', enforceConsentMiddleware, async (req, res) => {
    try {
      const plantData = insertPlantSchema.parse(req.body);
      const plant = await storage.createPlant(plantData);

      // Check and award achievements when plant is created
      const newAchievements = await storage.checkAndAwardAchievements(plantData.userId);

      res.json({
        plant,
        newAchievements: newAchievements.length > 0 ? newAchievements : undefined
      });
    } catch (error) {
      console.error('Error creating plant:', error);
      res.status(400).json({ message: 'Invalid plant data' });
    }
  });

  app.patch('/api/plants/:id/photo', createMultipartConsentMiddleware(upload.single('photo')), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No photo provided' });
      }

      // Get plant to find userId
      const plant = await storage.getPlantById(req.params.id);
      if (!plant) {
        return res.status(404).json({ message: 'Plant not found' });
      }

      const photoUrl = await saveFile(
        req.file.buffer,
        req.file.mimetype,
        plant.userId,
        'plant',
        plant.id
      );
      const updatedPlant = await storage.updatePlantPhoto(req.params.id, photoUrl);
      res.json(updatedPlant);
    } catch (error) {
      console.error('Error updating plant photo:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Emotion routes
  app.get('/api/emotions', async (req, res) => {
    try {
      await ensureDefaultData(); // Lazy initialization
      const emotions = await storage.getAllEmotions();
      res.json(emotions);
    } catch (error) {
      console.error('Error fetching emotions:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Journal entry routes with COPPA protection
  app.post('/api/journal-entries', createMultipartConsentMiddleware(upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'audio', maxCount: 1 }
  ])), async (req, res) => {
    try {
      let photoUrl: string | undefined;
      let audioUrl: string | undefined;

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const userId = req.body.userId;
      const plantId = req.body.plantId;

      if (files?.photo?.[0]) {
        photoUrl = await saveFile(
          files.photo[0].buffer,
          files.photo[0].mimetype,
          userId,
          'journal_entry',
          plantId
        );
      }

      if (files?.audio?.[0]) {
        audioUrl = await saveFile(
          files.audio[0].buffer,
          files.audio[0].mimetype,
          userId,
          'journal_entry',
          plantId
        );
      }

      const entryData = insertJournalEntrySchema.parse({
        ...req.body,
        photoUrl,
        audioUrl,
        pointsEarned: 10, // Default points for entry
      });

      const entry = await storage.createJournalEntry(entryData);

      // Update user points
      await storage.updateUserPoints(entryData.userId, 10);

      // Update plant's latest photo if a photo was uploaded and plantId exists
      if (photoUrl && plantId) {
        await storage.updatePlantPhoto(plantId, photoUrl);
      }

      // Check and award any achievements the user has earned
      const newAchievements = await storage.checkAndAwardAchievements(entryData.userId);

      res.json({
        entry,
        newAchievements: newAchievements.length > 0 ? newAchievements : undefined
      });
    } catch (error) {
      console.error('Error creating journal entry:', error);
      res.status(400).json({ message: 'Invalid entry data' });
    }
  });

  app.get('/api/users/:userId/journal-entries', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const entries = await storage.getUserJournalEntries(req.params.userId, limit);
      res.json(entries);
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/users/:userId/journal-entries/latest', async (req, res) => {
    try {
      const entry = await storage.getLatestJournalEntry(req.params.userId);
      res.json(entry);
    } catch (error) {
      console.error('Error fetching latest entry:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Seed routes
  app.get('/api/users/:userId/seeds', async (req, res) => {
    try {
      const seeds = await storage.getUserSeeds(req.params.userId);
      res.json(seeds);
    } catch (error) {
      console.error('Error fetching seeds:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/seeds', createMultipartConsentMiddleware(upload.single('photo')), async (req, res) => {
    try {
      let photoUrl: string | undefined;
      const userId = req.body.userId;

      if (req.file) {
        photoUrl = await saveFile(
          req.file.buffer,
          req.file.mimetype,
          userId,
          'seed'
        );
      }

      const seedData = insertSeedSchema.parse({
        ...req.body,
        photoUrl,
        shareCode: generateShareCode(),
      });

      const seed = await storage.createSeed(seedData);
      res.json(seed);
    } catch (error) {
      console.error('Error creating seed:', error);
      res.status(400).json({ message: 'Invalid seed data' });
    }
  });

  app.get('/api/seeds/share/:shareCode', async (req, res) => {
    try {
      const seed = await storage.getSeedByShareCode(req.params.shareCode);
      if (!seed) {
        return res.status(404).json({ message: 'Seed not found' });
      }
      res.json(seed);
    } catch (error) {
      console.error('Error fetching seed by share code:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Achievement routes
  app.get('/api/achievements', async (req, res) => {
    try {
      await ensureDefaultData(); // Lazy initialization
      const achievements = await storage.getAllAchievements();
      res.json(achievements);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/users/:userId/achievements', async (req, res) => {
    try {
      const userAchievements = await storage.getUserAchievements(req.params.userId);
      res.json(userAchievements);
    } catch (error) {
      console.error('Error fetching user achievements:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Notification routes with COPPA protection
  app.post('/api/notifications', enforceConsentMiddleware, async (req, res) => {
    try {
      const { userId, title, message, type } = req.body;
      const notification = await storage.createNotification(userId, title, message, type);
      res.json(notification);
    } catch (error) {
      console.error('Error creating notification:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/users/:userId/notifications', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const notifications = await storage.getUserNotifications(req.params.userId, limit);
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Rewards routes
  app.get('/api/rewards', async (req, res) => {
    try {
      await ensureDefaultData(); // Lazy initialization
      const rewards = await storage.getAllRewards();
      res.json(rewards);
    } catch (error) {
      console.error('Error fetching rewards:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/rewards/:id/purchase', enforceConsentMiddleware, async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      const result = await storage.purchaseReward(userId, req.params.id);
      res.json(result);
    } catch (error) {
      console.error('Error purchasing reward:', error);
      const message = error instanceof Error ? error.message : 'Server error';
      const statusCode = message.includes('not found') ? 404 : 
                        message.includes('Insufficient points') || message.includes('already purchased') ? 400 : 500;
      res.status(statusCode).json({ message });
    }
  });

  app.get('/api/users/:userId/rewards', async (req, res) => {
    try {
      const rewards = await storage.getUserRewards(req.params.userId);
      res.json(rewards);
    } catch (error) {
      console.error('Error fetching user rewards:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // TEMPORARY: Create plant for existing users without one
  app.post('/api/users/:userId/create-missing-plant', async (req, res) => {
    try {
      const userId = req.params.userId;

      // Check if user already has a plant
      const existingPlant = await storage.getActivePlant(userId);
      if (existingPlant) {
        return res.json({ message: 'User already has a plant', plant: existingPlant });
      }

      // Create plant for user
      const plant = await storage.createPlant({
        userId: userId,
        name: 'Mi Plantita',
        type: 'seedling',
        status: 'growing',
        isActive: true
      });

      res.json({ message: 'Plant created successfully', plant });
    } catch (error) {
      console.error('Error creating plant for user:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // TEMPORARY: Update professional role to facilitator
  app.post('/api/migrate-professional-to-facilitator', async (req, res) => {
    try {
      const result = await db
        .update(users)
        .set({ role: 'facilitator' })
        .where(eq(users.role, 'professional'))
        .returning();

      res.json({
        message: 'Migration completed successfully',
        updatedUsers: result.length,
        users: result
      });
    } catch (error) {
      console.error('Error migrating users:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Profile history routes
  app.get('/api/users/:userId/profile-history', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const history = await getProfileHistory(req.params.userId, limit);
      res.json(history);
    } catch (error) {
      console.error('Error fetching profile history:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Facilitator dashboard endpoint
  app.get('/api/facilitator/dashboard', async (req, res) => {
    try {
      // Run default data initialization in background, don't wait
      ensureDefaultData();

      // Get all children users with their latest emotion
      const children = await storage.getAllChildren();

      // Batch all queries for better performance
      const childrenWithEmotions = await Promise.all(
        children.map(async (child) => {
          // Run both queries in parallel for each child
          const [latestEntry, journalEntriesCount] = await Promise.all([
            storage.getLatestJournalEntry(child.id),
            storage.getJournalEntriesCount(child.id),
          ]);

          return {
            id: child.id,
            alias: child.alias,
            age: child.age,
            latestEmotion: latestEntry?.emotion ? {
              emoji: latestEntry.emotion.emoji,
              name: latestEntry.emotion.name,
            } : null,
            journalEntriesCount,
            points: child.points || 0,
            createdAt: child.createdAt,
          };
        })
      );

      res.json({
        children: childrenWithEmotions,
      });
    } catch (error) {
      console.error('Error fetching facilitator dashboard:', error);
      res.status(500).json({ message: 'Error fetching dashboard data' });
    }
  });

  // Child profile endpoint for facilitator
  app.get('/api/facilitator/child/:id', async (req, res) => {
    try {
      // Run default data initialization in background, don't wait
      ensureDefaultData();

      const childId = req.params.id;

      // Get child user first
      const child = await storage.getUser(childId);
      if (!child || child.role !== 'child') {
        return res.status(404).json({ message: 'Child not found' });
      }

      // Fetch all data in parallel for better performance
      const [plant, journalEntries, journalEntriesCount, allAchievements, userAchievements, userRewards] = await Promise.all([
        storage.getUserPlant(childId),
        storage.getJournalEntriesWithEmotions(childId),
        storage.getJournalEntriesCount(childId),
        storage.getAllAchievements(),
        storage.getUserAchievements(childId),
        storage.getUserRewards(childId),
      ]);

      // Process achievements
      const earnedAchievementIds = new Set(userAchievements.map(ua => ua.achievementId));
      const achievements = allAchievements.map(achievement => ({
        ...achievement,
        earned: earnedAchievementIds.has(achievement.id),
      }));

      res.json({
        child: {
          ...child,
          journalEntriesCount,
        },
        plant,
        journalEntries,
        achievements,
        userRewards,
      });
    } catch (error) {
      console.error('Error fetching child profile:', error);
      res.status(500).json({ message: 'Error fetching child profile' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Initialize default emotions using upsert for idempotent, self-healing behavior
async function initializeDefaultEmotions() {
  try {
    const defaultEmotions = [
      { name: 'Ansiedad', emoji: '😰', color: 'purple', description: 'Me siento nervioso, como mariposas en la panza' },
      { name: 'Rechazo', emoji: '🙄', color: 'gray', description: 'No quiero hacer algo o no me gusta' },
      { name: 'Frustración', emoji: '😤', color: 'orange', description: 'Estoy molesto porque algo no sale bien' },
      { name: 'Rabia', emoji: '😡', color: 'red', description: 'Estoy muy enojado' },
      { name: 'Miedo', emoji: '😨', color: 'indigo', description: 'Tengo miedo de algo' },
      { name: 'Diversión', emoji: '😄', color: 'green', description: 'Me estoy divirtiendo mucho' },
      { name: 'Alegría', emoji: '😊', color: 'yellow', description: 'Me siento feliz y contento' },
      { name: 'Aceptado', emoji: '🤗', color: 'pink', description: 'Me siento querido y valorado' },
    ];

    // Batch upsert in parallel for speed
    await Promise.all(defaultEmotions.map(emotion => storage.upsertEmotion(emotion)));
  } catch (error) {
    console.error('Error initializing default emotions:', error);
  }
}

// Initialize default achievements
async function initializeDefaultAchievements() {
  try {
    // Check if achievements already exist
    const existing = await db.select().from(achievements).limit(1);
    if (existing.length > 0) {
      return; // Already initialized
    }

    const defaultAchievements = [
      {
        name: 'Primera Semilla',
        description: 'Plantaste tu primera semilla',
        iconName: 'seedling',
        pointsRequired: 10,
        condition: JSON.stringify({ type: 'plant_created', count: 1 }),
      },
      {
        name: 'Primer Registro',
        description: 'Escribiste tu primera entrada emocional',
        iconName: 'leaf',
        pointsRequired: 10,
        condition: JSON.stringify({ type: 'journal_entries', count: 1 }),
      },
      {
        name: '7 Días',
        description: 'Has cuidado tu planta por 7 días',
        iconName: 'calendar-check',
        pointsRequired: 70,
        condition: JSON.stringify({ type: 'days_caring', count: 7 }),
      },
      {
        name: 'Escritor de Emociones',
        description: 'Has escrito 10 entradas emocionales',
        iconName: 'book-open',
        pointsRequired: 100,
        condition: JSON.stringify({ type: 'journal_entries', count: 10 }),
      },
    ];

    // Insert all at once for better performance
    await db.insert(achievements).values(
      defaultAchievements.map(a => ({
        name: a.name,
        description: a.description,
        iconName: a.iconName,
        pointsRequired: a.pointsRequired,
        condition: a.condition,
        isActive: true
      }))
    );
  } catch (error) {
    console.error('Error initializing default achievements:', error);
  }
}

// Initialize default rewards
async function initializeDefaultRewards() {
  try {
    // Check if rewards already exist
    const existing = await db.select().from(rewards).limit(1);
    if (existing.length > 0) {
      return; // Already initialized
    }

    const defaultRewards = [
      {
        name: 'Pack de Stickers Naturales',
        description: 'Colección de stickers de plantas y emociones',
        emoji: '🌿',
        pointsCost: 50,
        category: 'stickers',
        isActive: true,
      },
      {
        name: 'Guía de Cuidado de Plantas',
        description: 'Tips especiales para cuidar tu planta',
        emoji: '📚',
        pointsCost: 75,
        category: 'guides',
        isActive: true,
      },
      {
        name: 'Semilla Misteriosa',
        description: 'Una semilla sorpresa para tu colección',
        emoji: '🎁',
        pointsCost: 100,
        category: 'items',
        isActive: true,
      },
      {
        name: 'Insignia de Jardinero Experto',
        description: 'Una insignia especial para mostrar tu dedicación',
        emoji: '🏅',
        pointsCost: 150,
        category: 'badges',
        isActive: true,
      },
      {
        name: 'Avatar Especial de Planta',
        description: 'Un avatar único con temática de plantas',
        emoji: '🌱',
        pointsCost: 120,
        category: 'avatars',
        isActive: true,
      },
      {
        name: 'Fondo de Jardín Secreto',
        description: 'Un hermoso fondo para personalizar tu perfil',
        emoji: '🪴',
        pointsCost: 200,
        category: 'backgrounds',
        isActive: true,
      }
    ];

    // Insert all at once for better performance
    await db.insert(rewards).values(defaultRewards);
  } catch (error) {
    console.error('Error initializing default rewards:', error);
  }
}
