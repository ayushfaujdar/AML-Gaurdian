import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertEntitySchema, 
  insertTransactionSchema, 
  insertAlertSchema,
  insertEntityRelationshipSchema,
  insertCaseSchema,
  insertReportSchema,
  insertActivitySchema,
  insertMlModelSchema,
  insertUserSchema
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { transactionPatternRecognition } from "./ml/transaction-pattern";
import { analyzeEntityNetwork } from "./ml/entity-network";
import { detectAnomalies } from "./ml/anomaly-detection";
import { calculateRiskScore } from "./ml/risk-scoring";
import { generateAlerts } from "./services/alert-service";
import { analyzeEntityData } from "./services/entity-service";
import { analyzeTransactions } from "./services/transaction-service";
import { generateReport } from "./services/report-service";

// Validate request body against schema
function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: () => void) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(400).json({ message: "Invalid request body" });
      }
    }
  };
}

// Dashboard statistics
async function getDashboardStats(req: Request, res: Response) {
  try {
    const alerts = await storage.getAllAlerts();
    const highRiskEntities = await storage.getEntitiesByRiskLevel("high");
    const criticalRiskEntities = await storage.getEntitiesByRiskLevel("critical");
    const cases = await storage.getAllCases();
    const reports = await storage.getAllReports();
    
    // Calculate percentage changes (in a real app, we'd query for previous period)
    // Here we'll just use static values for demo purposes
    const stats = {
      alertsCount: alerts.length,
      highRiskEntitiesCount: highRiskEntities.length + criticalRiskEntities.length,
      casesCount: cases.length,
      reportsCount: reports.length,
      alertsChange: 12,
      highRiskEntitiesChange: 5,
      casesChange: 0,
      reportsChange: 8
    };
    
    return res.json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Recent activities
async function getRecentActivities(req: Request, res: Response) {
  try {
    const activities = await storage.getAllActivities();
    // Sort by timestamp descending and take the first 10
    const recentActivities = activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
      
    return res.json(recentActivities);
  } catch (error) {
    console.error("Error fetching recent activities:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Priority alerts
async function getPriorityAlerts(req: Request, res: Response) {
  try {
    const alerts = await storage.getAllAlerts();
    // Sort by risk score descending and take the first 5
    const priorityAlerts = alerts
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5);
      
    return res.json(priorityAlerts);
  } catch (error) {
    console.error("Error fetching priority alerts:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Analyze transaction patterns
async function analyzePatterns(req: Request, res: Response) {
  try {
    const transactions = await storage.getAllTransactions();
    const patterns = transactionPatternRecognition(transactions);
    return res.json(patterns);
  } catch (error) {
    console.error("Error analyzing transaction patterns:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Entity network analysis
async function getEntityNetwork(req: Request, res: Response) {
  try {
    const entityId = req.params.entityId;
    const entity = await storage.getEntity(entityId);
    
    if (!entity) {
      return res.status(404).json({ message: "Entity not found" });
    }
    
    const relationships = await storage.getEntityRelationshipsByEntity(entityId);
    const relatedEntityIds = new Set<string>();
    
    relationships.forEach(rel => {
      if (rel.sourceEntityId === entityId) {
        relatedEntityIds.add(rel.targetEntityId);
      } else {
        relatedEntityIds.add(rel.sourceEntityId);
      }
    });
    
    const relatedEntities = await Promise.all(
      Array.from(relatedEntityIds).map(id => storage.getEntity(id))
    );
    
    const networkData = {
      centralEntity: entity,
      relationships,
      relatedEntities: relatedEntities.filter(Boolean) // Filter out any undefined entities
    };
    
    return res.json(networkData);
  } catch (error) {
    console.error("Error fetching entity network:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Risk heat map data
async function getRiskHeatMap(req: Request, res: Response) {
  try {
    // In a real application, this would be generated from actual data
    // Here we'll create a sample heat map for demonstration
    const heatMapData = Array.from({ length: 100 }, (_, i) => ({
      x: i % 10,
      y: Math.floor(i / 10),
      risk: Math.random() * 100 // Random risk score between 0-100
    }));
    
    return res.json(heatMapData);
  } catch (error) {
    console.error("Error generating risk heat map:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Process transaction and evaluate risk
async function processTransaction(req: Request, res: Response) {
  try {
    const transaction = req.body;
    
    // Calculate risk score
    const riskScore = calculateRiskScore(transaction);
    
    // Determine risk level based on score
    let riskLevel = "low";
    if (riskScore > 85) riskLevel = "critical";
    else if (riskScore > 70) riskLevel = "high";
    else if (riskScore > 40) riskLevel = "medium";
    
    // Create transaction with risk assessment
    const createdTransaction = await storage.createTransaction({
      ...transaction,
      riskScore,
      riskLevel
    });
    
    // Generate alerts if risk is high enough
    if (riskScore > 70) {
      const alert = await storage.createAlert({
        entityId: transaction.sourceEntityId,
        transactionId: createdTransaction.id,
        timestamp: new Date().toISOString(),
        type: "transaction_pattern",
        title: `High Risk Transaction Detected (Score: ${riskScore})`,
        description: `Unusual transaction pattern detected for Entity ${transaction.sourceEntityId}`,
        riskScore,
        riskLevel,
        status: "pending",
        detectionMethod: "ML Transaction Pattern Analysis"
      });
    }
    
    return res.status(201).json(createdTransaction);
  } catch (error) {
    console.error("Error processing transaction:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Register all routes
export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  app.get("/api/dashboard/stats", getDashboardStats);
  app.get("/api/dashboard/recent-activities", getRecentActivities);
  app.get("/api/dashboard/priority-alerts", getPriorityAlerts);
  app.get("/api/dashboard/risk-heatmap", getRiskHeatMap);
  app.get("/api/transaction-patterns", analyzePatterns);
  
  // Entity endpoints
  app.get("/api/entities", async (req, res) => {
    try {
      const entities = await storage.getAllEntities();
      return res.json(entities);
    } catch (error) {
      console.error("Error fetching entities:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/entities/:id", async (req, res) => {
    try {
      const entity = await storage.getEntity(req.params.id);
      if (!entity) return res.status(404).json({ message: "Entity not found" });
      return res.json(entity);
    } catch (error) {
      console.error("Error fetching entity:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/entities", validateBody(insertEntitySchema), async (req, res) => {
    try {
      const entity = await storage.createEntity(req.body);
      return res.status(201).json(entity);
    } catch (error) {
      console.error("Error creating entity:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Entity network
  app.get("/api/entity-network/:entityId", getEntityNetwork);
  
  // Entity relationships
  app.get("/api/entity-relationships", async (req, res) => {
    try {
      const relationships = await storage.getAllEntityRelationships();
      return res.json(relationships);
    } catch (error) {
      console.error("Error fetching entity relationships:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/entity-relationships", validateBody(insertEntityRelationshipSchema), async (req, res) => {
    try {
      const relationship = await storage.createEntityRelationship(req.body);
      return res.status(201).json(relationship);
    } catch (error) {
      console.error("Error creating entity relationship:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Risk analysis endpoints
  app.get("/api/risk-factors", async (req, res) => {
    try {
      // In a real app, this would be calculated from transaction data
      // Here we'll provide sample data for the demo
      return res.json({
        jurisdictional: 35,
        transactional: 42,
        behavioral: 28,
        entityBased: 48
      });
    } catch (error) {
      console.error("Error fetching risk factors:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/risk-distribution", async (req, res) => {
    try {
      const entities = await storage.getAllEntities();
      const distribution = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      };
      
      entities.forEach(entity => {
        if (entity.riskLevel === "critical") distribution.critical++;
        else if (entity.riskLevel === "high") distribution.high++;
        else if (entity.riskLevel === "medium") distribution.medium++;
        else distribution.low++;
      });
      
      return res.json(distribution);
    } catch (error) {
      console.error("Error calculating risk distribution:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Transaction endpoints
  app.get("/api/transactions", async (req, res) => {
    try {
      const transactions = await storage.getAllTransactions();
      return res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/transactions", validateBody(insertTransactionSchema), processTransaction);
  
  // Alert endpoints
  app.get("/api/alerts", async (req, res) => {
    try {
      const alerts = await storage.getAllAlerts();
      return res.json(alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/alerts/:id", async (req, res) => {
    try {
      const alert = await storage.getAlert(req.params.id);
      if (!alert) return res.status(404).json({ message: "Alert not found" });
      return res.json(alert);
    } catch (error) {
      console.error("Error fetching alert:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/alerts", validateBody(insertAlertSchema), async (req, res) => {
    try {
      const alert = await storage.createAlert(req.body);
      return res.status(201).json(alert);
    } catch (error) {
      console.error("Error creating alert:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.patch("/api/alerts/:id", async (req, res) => {
    try {
      const updatedAlert = await storage.updateAlert(req.params.id, req.body);
      if (!updatedAlert) return res.status(404).json({ message: "Alert not found" });
      return res.json(updatedAlert);
    } catch (error) {
      console.error("Error updating alert:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Case endpoints
  app.get("/api/cases", async (req, res) => {
    try {
      const cases = await storage.getAllCases();
      return res.json(cases);
    } catch (error) {
      console.error("Error fetching cases:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/cases", validateBody(insertCaseSchema), async (req, res) => {
    try {
      const caseData = await storage.createCase(req.body);
      return res.status(201).json(caseData);
    } catch (error) {
      console.error("Error creating case:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Report endpoints
  app.get("/api/reports", async (req, res) => {
    try {
      const reports = await storage.getAllReports();
      return res.json(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/reports", validateBody(insertReportSchema), async (req, res) => {
    try {
      const report = await storage.createReport(req.body);
      return res.status(201).json(report);
    } catch (error) {
      console.error("Error creating report:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Activity endpoints
  app.get("/api/activities", async (req, res) => {
    try {
      const activities = await storage.getAllActivities();
      return res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/activities", validateBody(insertActivitySchema), async (req, res) => {
    try {
      const activity = await storage.createActivity(req.body);
      return res.status(201).json(activity);
    } catch (error) {
      console.error("Error creating activity:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // ML model endpoints
  app.get("/api/ml-models", async (req, res) => {
    try {
      const models = await storage.getAllMlModels();
      return res.json(models);
    } catch (error) {
      console.error("Error fetching ML models:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/ml-models", validateBody(insertMlModelSchema), async (req, res) => {
    try {
      const model = await storage.createMlModel(req.body);
      return res.status(201).json(model);
    } catch (error) {
      console.error("Error creating ML model:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Authentication endpoints (simplified)
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      return res.json({ 
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      });
    } catch (error) {
      console.error("Error during login:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // User endpoints
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      return res.json(users.map(user => ({ 
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email,
        status: user.status
      })));
    } catch (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/users", validateBody(insertUserSchema), async (req, res) => {
    try {
      const user = await storage.createUser(req.body);
      return res.status(201).json({ 
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email,
        status: user.status
      });
    } catch (error) {
      console.error("Error creating user:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
