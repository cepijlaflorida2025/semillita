import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  timestamp, 
  integer, 
  boolean, 
  json, 
  index 
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - children with parental consent
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  alias: varchar("alias", { length: 50 }).notNull(), // Child's nickname
  avatar: varchar("avatar", { length: 100 }), // Avatar selection
  colorTheme: varchar("color_theme", { length: 50 }).default("green"),
  points: integer("points").default(0),
  daysSincePlanting: integer("days_since_planting").default(0),

  // Age validation
  age: integer("age").notNull().default(10), // Required for COPPA compliance, default 10 years

  // Context and role
  context: varchar("context", { length: 20 }).notNull().default("home"), // "workshop" or "home"
  role: varchar("role", { length: 20 }).notNull().default("child"), // "child", "professional", "facilitator"

  // Enhanced parental consent system
  parentalConsent: boolean("parental_consent").default(false),
  parentEmail: varchar("parent_email", { length: 255 }),
  parentalConsentDate: timestamp("parental_consent_date"),
  consentVerified: boolean("consent_verified").default(false),

  // Legacy workshop mode (maintaining backward compatibility)
  isWorkshopMode: boolean("is_workshop_mode").default(false),

  // Accessibility settings per user
  accessibilitySettings: json("accessibility_settings").default({
    fontSize: 'medium'
  }),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (users) => ({
  aliasIndex: index("users_alias_idx").on(users.alias)
}));

// Plants - each user can have multiple plants over time
export const plants = pgTable("plants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }),
  type: varchar("type", { length: 100 }), // tomato, sunflower, basil
  status: varchar("status", { length: 50 }).default("growing"), // growing, alive, withered
  plantedAt: timestamp("planted_at").defaultNow(),
  firstPhotoUrl: text("first_photo_url"),
  latestPhotoUrl: text("latest_photo_url"),
  milestones: json("milestones"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Emotions - predefined emotion types
export const emotions = pgTable("emotions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 50 }).notNull().unique(),
  emoji: varchar("emoji", { length: 10 }).notNull(),
  color: varchar("color", { length: 50 }).notNull(),
  description: text("description"),
});

// Journal entries - core emotional journaling
export const journalEntries = pgTable("journal_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  plantId: varchar("plant_id").references(() => plants.id, { onDelete: "cascade" }),
  emotionId: varchar("emotion_id").references(() => emotions.id),
  photoUrl: text("photo_url"),
  audioUrl: text("audio_url"),
  textEntry: text("text_entry"),
  pointsEarned: integer("points_earned").default(10),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Seeds - for the seed vault sharing feature
export const seeds = pgTable("seeds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 100 }).notNull(),
  origin: varchar("origin", { length: 200 }),
  photoUrl: text("photo_url"),
  notes: text("notes"),
  shareCode: varchar("share_code", { length: 20 }).unique(),
  isShared: boolean("is_shared").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Achievements - gamification badges
export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  iconName: varchar("icon_name", { length: 50 }),
  pointsRequired: integer("points_required"),
  condition: text("condition"), // JSON string for achievement conditions
  isActive: boolean("is_active").default(true),
});

// User achievements - tracking which achievements users have earned
export const userAchievements = pgTable("user_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  achievementId: varchar("achievement_id").notNull().references(() => achievements.id),
  earnedAt: timestamp("earned_at").defaultNow(),
});

// Notifications - for push notification history
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 100 }),
  message: text("message"),
  type: varchar("type", { length: 50 }).default("reminder"), // reminder, achievement, milestone
  isRead: boolean("is_read").default(false),
  sentAt: timestamp("sent_at").defaultNow(),
});

// Rewards - available items in the rewards store
export const rewards = pgTable("rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  emoji: varchar("emoji", { length: 10 }),
  pointsCost: integer("points_cost").notNull(),
  category: varchar("category", { length: 50 }), // stickers, guides, items, badges
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User rewards - tracking which rewards users have purchased
export const userRewards = pgTable("user_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rewardId: varchar("reward_id").notNull().references(() => rewards.id),
  purchasedAt: timestamp("purchased_at").defaultNow(),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  plants: many(plants),
  journalEntries: many(journalEntries),
  seeds: many(seeds),
  userAchievements: many(userAchievements),
  notifications: many(notifications),
  userRewards: many(userRewards),
}));

export const plantsRelations = relations(plants, ({ one, many }) => ({
  user: one(users, {
    fields: [plants.userId],
    references: [users.id],
  }),
  journalEntries: many(journalEntries),
}));

export const emotionsRelations = relations(emotions, ({ many }) => ({
  journalEntries: many(journalEntries),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one }) => ({
  user: one(users, {
    fields: [journalEntries.userId],
    references: [users.id],
  }),
  plant: one(plants, {
    fields: [journalEntries.plantId],
    references: [plants.id],
  }),
  emotion: one(emotions, {
    fields: [journalEntries.emotionId],
    references: [emotions.id],
  }),
}));

export const seedsRelations = relations(seeds, ({ one }) => ({
  user: one(users, {
    fields: [seeds.userId],
    references: [users.id],
  }),
}));

export const achievementsRelations = relations(achievements, ({ many }) => ({
  userAchievements: many(userAchievements),
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, {
    fields: [userAchievements.userId],
    references: [users.id],
  }),
  achievement: one(achievements, {
    fields: [userAchievements.achievementId],
    references: [achievements.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const rewardsRelations = relations(rewards, ({ many }) => ({
  userRewards: many(userRewards),
}));

export const userRewardsRelations = relations(userRewards, ({ one }) => ({
  user: one(users, {
    fields: [userRewards.userId],
    references: [users.id],
  }),
  reward: one(rewards, {
    fields: [userRewards.rewardId],
    references: [rewards.id],
  }),
}));

// Zod schemas
// Base schema without role-specific fields
const baseUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Role-conditional validation using discriminated union
export const insertUserSchema = z.discriminatedUnion("role", [
  // Child role - simplified consent (modo prototipo)
  z.object({
    alias: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    avatar: z.string().optional(),
    colorTheme: z.string().default("green"),
    points: z.number().default(0),
    daysSincePlanting: z.number().default(0),
    age: z.number()
      .min(6, "Debes tener al menos 6 años para usar la aplicación")
      .max(17, "Esta aplicación está diseñada para niños de 6-17 años"),
    context: z.enum(["workshop", "home"]).default("home"),
    role: z.literal("child"),
    isWorkshopMode: z.boolean().default(false),
    parentEmail: z.string().optional().nullable(),
    parentalConsent: z.boolean().optional().nullable(),
    consentAcknowledgment: z.boolean().refine(val => val === true,
      "Debes confirmar que has leído y aceptas los términos"),
    parentalConsentDate: z.string().optional().nullable(),
    consentVerified: z.boolean().optional().default(true),
  }),
  // Professional/Caregiver role combined - no parental consent needed
  z.object({
    alias: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    avatar: z.string().optional(),
    colorTheme: z.string().default("green"),
    points: z.number().default(0),
    daysSincePlanting: z.number().default(0),
    age: z.number().min(18, "Los profesionales/cuidadores deben ser mayores de edad"),
    context: z.enum(["workshop", "home"]).default("home"),
    role: z.literal("professional"),
    isWorkshopMode: z.boolean().default(false),
    parentEmail: z.string().optional().nullable(),
    parentalConsent: z.boolean().optional().nullable(),
    consentAcknowledgment: z.boolean().refine(val => val === true,
      "Debes confirmar que has leído y aceptas los términos"),
    parentalConsentDate: z.string().optional().nullable(),
    consentVerified: z.boolean().optional().default(true),
  }),
  // Facilitator role - for workshop facilitators
  z.object({
    alias: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    avatar: z.string().optional(),
    colorTheme: z.string().default("orange"),
    points: z.number().default(0),
    daysSincePlanting: z.number().default(0),
    age: z.number().min(18, "Los facilitadores deben ser mayores de edad"),
    context: z.enum(["workshop", "home"]).default("workshop"),
    role: z.literal("facilitator"),
    isWorkshopMode: z.boolean().default(true),
    parentEmail: z.string().optional().nullable(),
    parentalConsent: z.boolean().optional().nullable(),
    consentAcknowledgment: z.boolean().optional().default(true),
    parentalConsentDate: z.string().optional().nullable(),
    consentVerified: z.boolean().optional().default(true),
  }),
]);

export const insertPlantSchema = createInsertSchema(plants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  plantId: z.string().optional().nullable(),
});

export const insertSeedSchema = createInsertSchema(seeds).omit({
  id: true,
  createdAt: true,
});

export const insertEmotionSchema = createInsertSchema(emotions).omit({
  id: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
});

export const insertRewardSchema = createInsertSchema(rewards).omit({
  id: true,
  createdAt: true,
});

export const insertUserRewardSchema = createInsertSchema(userRewards).omit({
  id: true,
  purchasedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Plant = typeof plants.$inferSelect;
export type InsertPlant = z.infer<typeof insertPlantSchema>;

export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;

export type Seed = typeof seeds.$inferSelect;
export type InsertSeed = z.infer<typeof insertSeedSchema>;

export type Emotion = typeof emotions.$inferSelect;
export type InsertEmotion = z.infer<typeof insertEmotionSchema>;

export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;

export type UserAchievement = typeof userAchievements.$inferSelect;
export type Notification = typeof notifications.$inferSelect;

export type Reward = typeof rewards.$inferSelect;
export type InsertReward = z.infer<typeof insertRewardSchema>;

export type UserReward = typeof userRewards.$inferSelect;
export type InsertUserReward = z.infer<typeof insertUserRewardSchema>;
