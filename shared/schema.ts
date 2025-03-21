import { pgTable, text, serial, integer, boolean, jsonb, timestamp, real, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("analyst"),
  status: text("status").notNull().default("active"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  role: true,
  status: true,
});

// Entities table
export const entities = pgTable("entities", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  jurisdiction: text("jurisdiction").notNull(),
  registrationDate: timestamp("registration_date").notNull(),
  riskScore: real("risk_score").notNull().default(0),
  riskLevel: text("risk_level").notNull().default("low"),
  status: text("status").notNull().default("pending"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertEntitySchema = createInsertSchema(entities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Entity Relationships table
export const entityRelationships = pgTable("entity_relationships", {
  id: text("id").primaryKey(),
  sourceEntityId: text("source_entity_id").notNull().references(() => entities.id),
  targetEntityId: text("target_entity_id").notNull().references(() => entities.id),
  relationshipType: text("relationship_type").notNull(),
  strength: real("strength").notNull().default(1),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertEntityRelationshipSchema = createInsertSchema(entityRelationships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Transactions table
export const transactions = pgTable("transactions", {
  id: text("id").primaryKey(),
  sourceEntityId: text("source_entity_id").notNull().references(() => entities.id),
  destinationEntityId: text("destination_entity_id").notNull().references(() => entities.id),
  amount: real("amount").notNull(),
  currency: text("currency").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  category: text("category").notNull(),
  riskScore: real("risk_score").notNull().default(0),
  riskLevel: text("risk_level").notNull().default("low"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

// Alerts table
export const alerts = pgTable("alerts", {
  id: text("id").primaryKey(),
  entityId: text("entity_id").notNull().references(() => entities.id),
  transactionId: text("transaction_id").references(() => transactions.id),
  timestamp: timestamp("timestamp").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  riskScore: real("risk_score").notNull(),
  riskLevel: text("risk_level").notNull(),
  status: text("status").notNull().default("pending"),
  assignedTo: text("assigned_to").references(() => users.id),
  detectionMethod: text("detection_method").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Cases table
export const cases = pgTable("cases", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("in progress"),
  priority: text("priority").notNull().default("medium"),
  entityIds: jsonb("entity_ids").notNull().$type<string[]>(),
  alertIds: jsonb("alert_ids").notNull().$type<string[]>(),
  assignedTo: text("assigned_to").references(() => users.id),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCaseSchema = createInsertSchema(cases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Reports table
export const reports = pgTable("reports", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull().references(() => cases.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("draft"),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  submittedAt: timestamp("submitted_at"),
  data: jsonb("data"),
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
});

// Activities table
export const activities = pgTable("activities", {
  id: text("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  actionType: text("action_type").notNull(),
  actionDescription: text("action_description").notNull(),
  entityId: text("entity_id").references(() => entities.id),
  caseId: text("case_id").references(() => cases.id),
  status: text("status"),
  metadata: jsonb("metadata"),
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
});

// ML Models table
export const mlModels = pgTable("ml_models", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  accuracy: real("accuracy"),
  precision: real("precision"),
  recall: real("recall"),
  f1Score: real("f1_score"),
  falsePositiveRate: real("false_positive_rate"),
  falseNegativeRate: real("false_negative_rate"),
  lastTrainedDate: timestamp("last_trained_date"),
  status: text("status").notNull().default("inactive"),
  configuration: jsonb("configuration"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMlModelSchema = createInsertSchema(mlModels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for use in the application
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Entity = typeof entities.$inferSelect;
export type InsertEntity = z.infer<typeof insertEntitySchema>;

export type EntityRelationship = typeof entityRelationships.$inferSelect;
export type InsertEntityRelationship = z.infer<typeof insertEntityRelationshipSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;

export type Case = typeof cases.$inferSelect;
export type InsertCase = z.infer<typeof insertCaseSchema>;

export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type MlModel = typeof mlModels.$inferSelect;
export type InsertMlModel = z.infer<typeof insertMlModelSchema>;
