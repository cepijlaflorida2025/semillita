import {
  users,
  plants,
  emotions,
  journalEntries,
  seeds,
  achievements,
  userAchievements,
  notifications,
  rewards,
  userRewards,
  type User,
  type InsertUser,
  type Plant,
  type InsertPlant,
  type JournalEntry,
  type InsertJournalEntry,
  type Emotion,
  type InsertEmotion,
  type Seed,
  type InsertSeed,
  type Achievement,
  type UserAchievement,
  type Notification,
  type Reward,
  type InsertReward,
  type UserReward,
  type InsertUserReward
} from "../shared/schema.js";
import { db } from "./db.js";
import { eq, desc, and, count, sql } from "drizzle-orm";

// Extended type for journal entries with populated emotion
export type JournalEntryWithEmotion = JournalEntry & {
  emotion: Emotion | null;
};

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByAlias(alias: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPoints(id: string, pointsToAdd: number): Promise<User>;
  updateUserConsent(id: string, consentVerified: boolean): Promise<User>;
  deleteUser(id: string): Promise<void>;
  // Return a minimal child summary for facilitator dashboard
  getAllChildren(): Promise<{
    id: string;
    alias: string;
    age: number;
    points: number | null;
    createdAt: Date | null;
  }[]>;
  getJournalEntriesCount(userId: string): Promise<number>;
  getUserPlant(userId: string): Promise<Plant | undefined>;
  getJournalEntriesWithEmotions(userId: string): Promise<JournalEntryWithEmotion[]>;

  // Plant operations
  getActivePlant(userId: string): Promise<Plant | undefined>;
  getPlantById(id: string): Promise<Plant | undefined>;
  createPlant(plant: InsertPlant): Promise<Plant>;
  updatePlantPhoto(id: string, photoUrl: string): Promise<Plant>;
  updatePlantStatus(id: string, status: string): Promise<Plant>;

  // Emotion operations
  getAllEmotions(): Promise<Emotion[]>;
  createEmotion(emotion: InsertEmotion): Promise<Emotion>;
  upsertEmotion(emotion: InsertEmotion): Promise<Emotion>;

  // Journal entry operations
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  getUserJournalEntries(userId: string, limit?: number): Promise<JournalEntryWithEmotion[]>;
  getLatestJournalEntry(userId: string): Promise<JournalEntryWithEmotion | undefined>;
  getJournalEntryById(id: string): Promise<JournalEntry | undefined>;
  deleteJournalEntry(id: string): Promise<void>;

  // Seed operations
  getUserSeeds(userId: string): Promise<Seed[]>;
  createSeed(seed: InsertSeed): Promise<Seed>;
  getSeedByShareCode(shareCode: string): Promise<Seed | undefined>;

  // Achievement operations
  getAllAchievements(): Promise<Achievement[]>;
  createAchievement(achievement: { name: string; description: string; iconName: string; pointsRequired: number; condition: string }): Promise<Achievement>;
  getUserAchievements(userId: string): Promise<UserAchievement[]>;
  awardAchievement(userId: string, achievementId: string): Promise<UserAchievement>;
  checkAndAwardAchievements(userId: string): Promise<UserAchievement[]>;

  // Notification operations
  createNotification(userId: string, title: string, message: string, type?: string): Promise<Notification>;
  getUserNotifications(userId: string, limit?: number): Promise<Notification[]>;

  // Rewards operations
  getAllRewards(): Promise<Reward[]>;
  getAllRewardsIncludingInactive(): Promise<Reward[]>;
  createReward(reward: InsertReward): Promise<Reward>;
  purchaseReward(userId: string, rewardId: string): Promise<{ userReward: UserReward; updatedUser: User }>;
  getUserRewards(userId: string): Promise<(UserReward & { reward: Reward })[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByAlias(alias: string): Promise<User | undefined> {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.alias, alias))
      .limit(1);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      console.log('🔍 [createUser] Starting user creation...');
      console.log('🔍 [createUser] Input data:', {
        role: insertUser.role,
        alias: insertUser.alias,
        age: insertUser.age,
        context: insertUser.context
      });

      // Handle date conversion for parentalConsentDate
      const processedUser = {
        ...insertUser,
        parentalConsentDate: insertUser.role === 'child' && insertUser.parentalConsentDate
          ? new Date(insertUser.parentalConsentDate)
          : insertUser.role === 'child' ? null : undefined
      };

      console.log('🔍 [createUser] Processed user data ready, inserting to DB...');

      const [user] = await db
        .insert(users)
        .values([processedUser])
        .returning();

      console.log('✅ [createUser] User created successfully:', user.id);
      return user;
    } catch (error) {
      console.error('❌ [createUser] Error creating user:', error);
      console.error('❌ [createUser] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  async updateUserPoints(id: string, pointsToAdd: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        points: sql`${users.points} + ${pointsToAdd}`,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserConsent(id: string, consentVerified: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        consentVerified,
        parentalConsentDate: consentVerified ? new Date() : null,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Plant operations
  async getActivePlant(userId: string): Promise<Plant | undefined> {
    const [plant] = await db
      .select()
      .from(plants)
      .where(and(eq(plants.userId, userId), eq(plants.isActive, true)))
      .orderBy(desc(plants.createdAt))
      .limit(1);
    return plant;
  }

  async getPlantById(id: string): Promise<Plant | undefined> {
    const [plant] = await db
      .select()
      .from(plants)
      .where(eq(plants.id, id));
    return plant;
  }

  async createPlant(insertPlant: InsertPlant): Promise<Plant> {
    const [plant] = await db
      .insert(plants)
      .values([insertPlant])
      .returning();
    return plant;
  }

  async updatePlantPhoto(id: string, photoUrl: string): Promise<Plant> {
    const [plant] = await db
      .update(plants)
      .set({ 
        latestPhotoUrl: photoUrl,
        updatedAt: new Date()
      })
      .where(eq(plants.id, id))
      .returning();
    return plant;
  }

  async updatePlantStatus(id: string, status: string): Promise<Plant> {
    const [plant] = await db
      .update(plants)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(plants.id, id))
      .returning();
    return plant;
  }

  // Emotion operations
  async getAllEmotions(): Promise<Emotion[]> {
    return await db.select().from(emotions);
  }

  async createEmotion(insertEmotion: InsertEmotion): Promise<Emotion> {
    const [emotion] = await db
      .insert(emotions)
      .values([insertEmotion])
      .returning();
    return emotion;
  }

  async upsertEmotion(insertEmotion: InsertEmotion): Promise<Emotion> {
    const [emotion] = await db
      .insert(emotions)
      .values([insertEmotion])
      .onConflictDoUpdate({
        target: emotions.name,
        set: {
          emoji: insertEmotion.emoji,
          color: insertEmotion.color,
          description: insertEmotion.description,
        },
      })
      .returning();
    return emotion;
  }

  // Journal entry operations
  async createJournalEntry(insertEntry: InsertJournalEntry): Promise<JournalEntry> {
    const [entry] = await db
      .insert(journalEntries)
      .values([insertEntry])
      .returning();
    return entry;
  }

  async getUserJournalEntries(userId: string, limit: number = 10): Promise<JournalEntryWithEmotion[]> {
    const entries = await db
      .select({
        id: journalEntries.id,
        userId: journalEntries.userId,
        plantId: journalEntries.plantId,
        emotionId: journalEntries.emotionId,
        textEntry: journalEntries.textEntry,
        photoUrl: journalEntries.photoUrl,
        audioUrl: journalEntries.audioUrl,
        pointsEarned: journalEntries.pointsEarned,
        createdAt: journalEntries.createdAt,
        updatedAt: journalEntries.updatedAt,
        emotion: emotions,
      })
      .from(journalEntries)
      .leftJoin(emotions, eq(journalEntries.emotionId, emotions.id))
      .where(eq(journalEntries.userId, userId))
      .orderBy(desc(journalEntries.createdAt))
      .limit(limit);

    return entries as JournalEntryWithEmotion[];
  }

  async getLatestJournalEntry(userId: string): Promise<JournalEntryWithEmotion | undefined> {
    const [entry] = await db
      .select({
        id: journalEntries.id,
        userId: journalEntries.userId,
        plantId: journalEntries.plantId,
        emotionId: journalEntries.emotionId,
        textEntry: journalEntries.textEntry,
        photoUrl: journalEntries.photoUrl,
        audioUrl: journalEntries.audioUrl,
        pointsEarned: journalEntries.pointsEarned,
        createdAt: journalEntries.createdAt,
        updatedAt: journalEntries.updatedAt,
        emotion: emotions,
      })
      .from(journalEntries)
      .leftJoin(emotions, eq(journalEntries.emotionId, emotions.id))
      .where(eq(journalEntries.userId, userId))
      .orderBy(desc(journalEntries.createdAt))
      .limit(1);

    return entry as JournalEntryWithEmotion | undefined;
  }

  async getJournalEntryById(id: string): Promise<JournalEntry | undefined> {
    const [entry] = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, id));
    return entry;
  }

  async deleteJournalEntry(id: string): Promise<void> {
    await db.delete(journalEntries).where(eq(journalEntries.id, id));
  }

  // Seed operations
  async getUserSeeds(userId: string): Promise<Seed[]> {
    return await db
      .select()
      .from(seeds)
      .where(eq(seeds.userId, userId))
      .orderBy(desc(seeds.createdAt));
  }

  async createSeed(insertSeed: InsertSeed): Promise<Seed> {
    const [seed] = await db
      .insert(seeds)
      .values([insertSeed])
      .returning();
    return seed;
  }

  async getSeedByShareCode(shareCode: string): Promise<Seed | undefined> {
    const [seed] = await db
      .select()
      .from(seeds)
      .where(eq(seeds.shareCode, shareCode));
    return seed;
  }

  // Achievement operations
  async getAllAchievements(): Promise<Achievement[]> {
    return await db
      .select()
      .from(achievements)
      .where(eq(achievements.isActive, true));
  }

  async createAchievement(achievement: { name: string; description: string; iconName: string; pointsRequired: number; condition: string }): Promise<Achievement> {
    const [newAchievement] = await db
      .insert(achievements)
      .values([{
        name: achievement.name,
        description: achievement.description,
        iconName: achievement.iconName,
        pointsRequired: achievement.pointsRequired,
        condition: achievement.condition,
        isActive: true
      }])
      .returning();
    return newAchievement;
  }

  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    return await db
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId))
      .orderBy(desc(userAchievements.earnedAt));
  }

  async awardAchievement(userId: string, achievementId: string): Promise<UserAchievement> {
    // Check if user already has this achievement
    const [existing] = await db
      .select()
      .from(userAchievements)
      .where(and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.achievementId, achievementId)
      ));

    if (existing) {
      return existing;
    }

    const [userAchievement] = await db
      .insert(userAchievements)
      .values([{ userId, achievementId }])
      .returning();
    return userAchievement;
  }

  async checkAndAwardAchievements(userId: string): Promise<UserAchievement[]> {
    // Get user data
    const user = await this.getUser(userId);
    if (!user) return [];

    // Get all achievements
    const allAchievements = await this.getAllAchievements();

    // Get user's existing achievements
    const userExistingAchievements = await this.getUserAchievements(userId);
    const earnedIds = new Set(userExistingAchievements.map(ua => ua.achievementId));

    // Get user stats
    const plant = await this.getActivePlant(userId);
    const journalEntriesData = await this.getUserJournalEntries(userId, 1000);
    const journalEntriesCount = journalEntriesData.length;

    const newlyAwarded: UserAchievement[] = [];

    for (const achievement of allAchievements) {
      // Skip if already earned
      if (earnedIds.has(achievement.id)) continue;

      let shouldAward = false;

      try {
        if (!achievement.condition) continue;
        const condition = JSON.parse(achievement.condition);

        switch (condition.type) {
          case 'plant_created':
            shouldAward = !!plant;
            break;
          case 'days_caring':
            if (plant && plant.plantedAt) {
              const daysCaring = Math.floor((Date.now() - new Date(plant.plantedAt).getTime()) / (1000 * 60 * 60 * 24));
              shouldAward = daysCaring >= condition.count;
            }
            break;
          case 'journal_entries':
            shouldAward = journalEntriesCount >= condition.count;
            break;
          case 'points':
            const threshold = condition.threshold || achievement.pointsRequired;
            shouldAward = (user.points ?? 0) >= threshold;
            break;
        }

        if (shouldAward) {
          const awarded = await this.awardAchievement(userId, achievement.id);
          newlyAwarded.push(awarded);
          // Award points for the achievement if applicable
          if (achievement.pointsRequired && achievement.pointsRequired > 0) {
            await this.updateUserPoints(userId, achievement.pointsRequired);
          }
        }
      } catch (error) {
        console.error('Error checking achievement condition:', error);
      }
    }

    return newlyAwarded;
  }

  // Notification operations
  async createNotification(userId: string, title: string, message: string, type: string = "reminder"): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values([{ userId, title, message, type }])
      .returning();
    return notification;
  }

  async getUserNotifications(userId: string, limit: number = 10): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.sentAt))
      .limit(limit);
  }

  // Rewards operations
  async getAllRewards(): Promise<Reward[]> {
    return await db
      .select()
      .from(rewards)
      .where(eq(rewards.isActive, true))
      .orderBy(rewards.pointsCost);
  }

  async getAllRewardsIncludingInactive(): Promise<Reward[]> {
    return await db
      .select()
      .from(rewards)
      .orderBy(rewards.pointsCost);
  }

  async createReward(reward: InsertReward): Promise<Reward> {
    const [newReward] = await db
      .insert(rewards)
      .values([reward])
      .returning();
    return newReward;
  }

  async purchaseReward(userId: string, rewardId: string): Promise<{ userReward: UserReward; updatedUser: User }> {
    return await db.transaction(async (tx) => {
      // Get reward cost
      const [reward] = await tx
        .select()
        .from(rewards)
        .where(eq(rewards.id, rewardId));
      
      if (!reward) {
        throw new Error('Reward not found');
      }

      // Get user's current points with row lock to prevent concurrent modifications
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .for('update');
      
      if (!user) {
        throw new Error('User not found');
      }

      if ((user.points ?? 0) < reward.pointsCost) {
        throw new Error('Insufficient points');
      }

      // Check if user already owns this reward
      const [existingPurchase] = await tx
        .select()
        .from(userRewards)
        .where(and(
          eq(userRewards.userId, userId),
          eq(userRewards.rewardId, rewardId)
        ));

      if (existingPurchase) {
        throw new Error('Reward already purchased');
      }

      // Purchase reward (deduct points and create user reward)
      const [updatedUser] = await tx
        .update(users)
        .set({ 
          points: sql`${users.points} - ${reward.pointsCost}`,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();

      const [userReward] = await tx
        .insert(userRewards)
        .values([{ userId, rewardId }])
        .returning();

      return { userReward, updatedUser };
    });
  }

  async getUserRewards(userId: string): Promise<(UserReward & { reward: Reward })[]> {
    return await db
      .select({
        id: userRewards.id,
        userId: userRewards.userId,
        rewardId: userRewards.rewardId,
        purchasedAt: userRewards.purchasedAt,
        reward: {
          id: rewards.id,
          name: rewards.name,
          description: rewards.description,
          emoji: rewards.emoji,
          pointsCost: rewards.pointsCost,
          category: rewards.category,
          isActive: rewards.isActive,
          createdAt: rewards.createdAt,
        }
      })
      .from(userRewards)
      .innerJoin(rewards, eq(userRewards.rewardId, rewards.id))
      .where(eq(userRewards.userId, userId))
      .orderBy(desc(userRewards.purchasedAt));
  }

  // Facilitator-specific operations
  async getAllChildren(): Promise<{ id: string; alias: string; age: number; points: number | null; createdAt: Date | null }[]> {
    // Select only the fields we need for the facilitator dashboard and limit results
    return await db
      .select({ id: users.id, alias: users.alias, age: users.age, points: users.points, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.role, 'child'))
      .orderBy(desc(users.createdAt))
      .limit(100);
  }

  async getJournalEntriesCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(journalEntries)
      .where(eq(journalEntries.userId, userId));
    return result[0]?.count || 0;
  }

  async getUserPlant(userId: string): Promise<Plant | undefined> {
    return await this.getActivePlant(userId);
  }

  async getJournalEntriesWithEmotions(userId: string): Promise<JournalEntryWithEmotion[]> {
    const entries = await db
      .select({
        id: journalEntries.id,
        userId: journalEntries.userId,
        plantId: journalEntries.plantId,
        emotionId: journalEntries.emotionId,
        textEntry: journalEntries.textEntry,
        photoUrl: journalEntries.photoUrl,
        audioUrl: journalEntries.audioUrl,
        pointsEarned: journalEntries.pointsEarned,
        createdAt: journalEntries.createdAt,
        updatedAt: journalEntries.updatedAt,
        emotion: emotions,
      })
      .from(journalEntries)
      .leftJoin(emotions, eq(journalEntries.emotionId, emotions.id))
      .where(eq(journalEntries.userId, userId))
      .orderBy(desc(journalEntries.createdAt));

    return entries as JournalEntryWithEmotion[];
  }
}

export const storage = new DatabaseStorage();
