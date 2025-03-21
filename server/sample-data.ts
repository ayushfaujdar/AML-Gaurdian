import { storage } from "./storage";
import { createSampleEntities, createSampleRelationships } from "./services/entity-service";
import { createSampleTransactions } from "./services/transaction-service";
import { generateAlerts } from "./services/alert-service";
import { insertUserSchema } from "@shared/schema";
import { mlService } from "./services/ml-service";

/**
 * Generates sample data for the AML Guardian system
 */
export async function generateSampleData() {
  console.log("Generating sample data for AML Guardian...");
  
  // Create admin user
  try {
    const adminUser = {
      username: "admin",
      password: "admin123",
      name: "Admin User",
      email: "admin@amlguardian.io",
      role: "admin",
      status: "active"
    };
    
    await storage.createUser(adminUser);
    console.log("Created admin user");
  } catch (error) {
    console.error("Error creating admin user:", error);
  }
  
  // Create sample entities
  let entities = [];
  try {
    entities = await createSampleEntities(20);
    console.log(`Created ${entities.length} sample entities`);
  } catch (error) {
    console.error("Error creating sample entities:", error);
  }
  
  // Create sample relationships between entities
  let relationships = [];
  try {
    relationships = await createSampleRelationships(entities, 30);
    console.log(`Created ${relationships.length} sample entity relationships`);
  } catch (error) {
    console.error("Error creating sample relationships:", error);
  }
  
  // Create sample transactions
  let transactions = [];
  try {
    transactions = await createSampleTransactions(entities, 50);
    console.log(`Created ${transactions.length} sample transactions`);
  } catch (error) {
    console.error("Error creating sample transactions:", error);
  }
  
  // Create special transaction patterns for ML model training
  try {
    await createStructuredTransactions(entities);
    await createRoundTripTransactions(entities);
    await createLayeringTransactions(entities);
    console.log("Created special transaction patterns for ML training");
  } catch (error) {
    console.error("Error creating special transaction patterns:", error);
  }
  
  // Generate alerts based on transactions and entities
  try {
    const alerts = await generateAlerts(transactions, entities);
    console.log(`Generated ${alerts.length} alerts based on transaction patterns`);
  } catch (error) {
    console.error("Error generating alerts:", error);
  }
  
  // Create a sample case
  if (entities.length > 0) {
    try {
      const entityIds = entities.slice(0, 3).map(entity => entity.id);
      
      const caseData = {
        title: "Suspicious Transaction Pattern Investigation",
        description: "Multiple high-value transactions between related entities in high-risk jurisdictions",
        status: "in progress",
        priority: "high",
        entityIds,
        alertIds: [],
        createdBy: "admin",
        assignedTo: "admin"
      };
      
      const createdCase = await storage.createCase(caseData);
      console.log(`Created sample case: ${createdCase.id}`);
      
      // Create sample activity
      const activityData = {
        timestamp: new Date(),
        userId: "admin",
        actionType: "create",
        actionDescription: "Opened new investigation case",
        status: "active",
        caseId: createdCase.id,
        entityId: entityIds[0]
      };
      
      await storage.createActivity(activityData);
      console.log("Created sample activity");
    } catch (error) {
      console.error("Error creating sample case:", error);
    }
  }
  
  // Create sample ML model
  try {
    const mlModelData = {
      name: "Transaction Pattern Recognition",
      type: "transaction_pattern",
      status: "active",
      accuracy: 0.92,
      precision: 0.89,
      recall: 0.91,
      f1Score: 0.90,
      falsePositiveRate: 0.08,
      falseNegativeRate: 0.09,
      lastTrainedDate: new Date(),
      configuration: {
        algorithm: "Deep Learning",
        features: ["amount", "frequency", "geography", "counterparties", "temporal_patterns"],
        hyperparameters: {
          layers: 4,
          neurons: 128,
          dropout: 0.2,
          learningRate: 0.001
        }
      }
    };
    
    await storage.createMlModel(mlModelData);
    console.log("Created sample ML model");
    
    // Initialize ML service
    try {
      await mlService.initialize();
      
      // Train ML models in the background (don't await to avoid blocking startup)
      mlService.trainAllModels(true).catch(err => {
        console.error('Error training ML models:', err);
      });
      
      console.log("Initialized ML service with TensorFlow models");
    } catch (error) {
      console.error("Error initializing ML service:", error);
    }
  } catch (error) {
    console.error("Error creating sample ML model:", error);
  }
  
  console.log("Sample data generation complete!");
}

/**
 * Create a set of structured transactions (just below reporting threshold)
 * to train the ML model to detect structuring
 */
async function createStructuredTransactions(entities: any[]) {
  if (entities.length < 2) return;
  
  const REPORTING_THRESHOLD = 10000;
  const sourceEntity = entities[0];
  const destEntity = entities[1];
  
  // Create 5 transactions just below threshold within a short timeframe
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 10);
  
  for (let i = 0; i < 5; i++) {
    const txDate = new Date(baseDate);
    txDate.setHours(txDate.getHours() + (i * 6)); // 6 hours apart
    
    // Amount just below threshold
    const amount = REPORTING_THRESHOLD - (500 + Math.random() * 1000);
    
    await storage.createTransaction({
      sourceEntityId: sourceEntity.id,
      destinationEntityId: destEntity.id,
      amount,
      currency: 'USD',
      timestamp: txDate,
      description: 'Structured payment',
      type: 'transfer',
      category: 'fiat',
      riskScore: 70,
      riskLevel: 'high'
    });
  }
}

/**
 * Create a round-trip transaction pattern
 * Funds that move through several entities and return to origin
 */
async function createRoundTripTransactions(entities: any[]) {
  if (entities.length < 4) return;
  
  // Select 4 entities for the round trip
  const entityA = entities[2];
  const entityB = entities[3];
  const entityC = entities[4];
  const entityD = entities[5];
  
  // Base amount
  const baseAmount = 25000;
  
  // Base date
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 15);
  
  // A -> B
  const txDate1 = new Date(baseDate);
  await storage.createTransaction({
    sourceEntityId: entityA.id,
    destinationEntityId: entityB.id,
    amount: baseAmount,
    currency: 'USD',
    timestamp: txDate1,
    description: 'Round-trip payment 1',
    type: 'transfer',
    category: 'fiat',
    riskScore: 50,
    riskLevel: 'medium'
  });
  
  // B -> C
  const txDate2 = new Date(baseDate);
  txDate2.setDate(txDate2.getDate() + 2);
  await storage.createTransaction({
    sourceEntityId: entityB.id,
    destinationEntityId: entityC.id,
    amount: baseAmount * 0.95, // Slight reduction to simulate fees
    currency: 'USD',
    timestamp: txDate2,
    description: 'Round-trip payment 2',
    type: 'transfer',
    category: 'fiat',
    riskScore: 50,
    riskLevel: 'medium'
  });
  
  // C -> D
  const txDate3 = new Date(baseDate);
  txDate3.setDate(txDate3.getDate() + 3);
  await storage.createTransaction({
    sourceEntityId: entityC.id,
    destinationEntityId: entityD.id,
    amount: baseAmount * 0.92,
    currency: 'USD',
    timestamp: txDate3,
    description: 'Round-trip payment 3',
    type: 'transfer',
    category: 'fiat',
    riskScore: 50,
    riskLevel: 'medium'
  });
  
  // D -> A (completing the circle)
  const txDate4 = new Date(baseDate);
  txDate4.setDate(txDate4.getDate() + 5);
  await storage.createTransaction({
    sourceEntityId: entityD.id,
    destinationEntityId: entityA.id,
    amount: baseAmount * 0.90,
    currency: 'USD',
    timestamp: txDate4,
    description: 'Round-trip payment 4',
    type: 'transfer',
    category: 'fiat',
    riskScore: 60,
    riskLevel: 'medium'
  });
}

/**
 * Create a layering transaction pattern
 * Funds that move through a series of entities in a chain
 */
async function createLayeringTransactions(entities: any[]) {
  if (entities.length < 6) return;
  
  // Select 6 entities for the layering
  const entities6 = entities.slice(6, 12);
  
  // Base amount
  const baseAmount = 100000;
  
  // Base date
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 20);
  
  // Create the layering chain
  for (let i = 0; i < entities6.length - 1; i++) {
    const sourceEntity = entities6[i];
    const destEntity = entities6[i + 1];
    
    const txDate = new Date(baseDate);
    txDate.setDate(txDate.getDate() + i);
    
    // Amount decreases slightly at each step
    const amount = baseAmount * (1 - (i * 0.03));
    
    await storage.createTransaction({
      sourceEntityId: sourceEntity.id,
      destinationEntityId: destEntity.id,
      amount,
      currency: 'USD',
      timestamp: txDate,
      description: `Layering payment ${i+1}`,
      type: 'transfer',
      category: 'fiat',
      riskScore: 55 + (i * 5), // Higher risk at each layer
      riskLevel: 'medium'
    });
  }
}