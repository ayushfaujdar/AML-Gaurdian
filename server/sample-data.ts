import { storage } from "./storage";
import { createSampleEntities, createSampleRelationships } from "./services/entity-service";
import { createSampleTransactions } from "./services/transaction-service";
import { generateAlerts } from "./services/alert-service";
import { insertUserSchema } from "@shared/schema";

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
        algorithm: "Random Forest",
        features: ["amount", "frequency", "geography", "counterparties"],
        hyperparameters: {
          maxDepth: 10,
          numTrees: 100,
          minSamplesLeaf: 5
        }
      }
    };
    
    await storage.createMlModel(mlModelData);
    console.log("Created sample ML model");
  } catch (error) {
    console.error("Error creating sample ML model:", error);
  }
  
  console.log("Sample data generation complete!");
}