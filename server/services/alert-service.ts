import { Transaction, Entity, Alert, InsertAlert } from "@shared/schema";
import { storage } from "../storage";
import { calculateRiskScore } from "../ml/risk-scoring";
import { generateId } from "../../client/src/lib/utils";

/**
 * Analyzes transactions and entities to generate alerts
 * 
 * @param transactions Transactions to analyze
 * @param entities Entities involved in the transactions
 * @returns Generated alerts
 */
export async function generateAlerts(
  transactions: Transaction[],
  entities: Entity[]
): Promise<Alert[]> {
  const alerts: Alert[] = [];
  
  // Generate alerts for high-risk transactions
  for (const transaction of transactions) {
    if (transaction.riskScore >= 70) {
      // Create alert for high-risk transaction
      const alertData: InsertAlert = {
        entityId: transaction.sourceEntityId,
        transactionId: transaction.id,
        timestamp: new Date().toISOString(),
        type: "transaction_pattern",
        title: `High Risk Transaction Detected (Score: ${transaction.riskScore})`,
        description: `Unusual transaction pattern detected for transaction ${transaction.id} from ${transaction.sourceEntityId} to ${transaction.destinationEntityId}. Amount: ${transaction.amount} ${transaction.currency}`,
        riskScore: transaction.riskScore,
        riskLevel: transaction.riskLevel,
        status: "pending",
        detectionMethod: "ML Transaction Pattern Analysis"
      };
      
      const alert = await storage.createAlert(alertData);
      alerts.push(alert);
    }
  }
  
  // Generate alerts for high-risk entities
  for (const entity of entities) {
    if (entity.riskScore >= 75 && entity.riskLevel !== "low") {
      // Check if there's already an alert for this entity in the last 24 hours
      const recentAlerts = await storage.getAlertsByEntity(entity.id);
      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);
      
      const hasRecentAlert = recentAlerts.some(alert => 
        new Date(alert.timestamp) > last24Hours && 
        alert.type === "entity_risk"
      );
      
      if (!hasRecentAlert) {
        // Create alert for high-risk entity
        const alertData: InsertAlert = {
          entityId: entity.id,
          timestamp: new Date().toISOString(),
          type: "entity_risk",
          title: `High Risk Entity Detected (Score: ${entity.riskScore})`,
          description: `Entity ${entity.id} has been flagged as high risk (${entity.riskLevel}). Jurisdiction: ${entity.jurisdiction}`,
          riskScore: entity.riskScore,
          riskLevel: entity.riskLevel,
          status: "pending",
          detectionMethod: "Entity Risk Assessment Model"
        };
        
        const alert = await storage.createAlert(alertData);
        alerts.push(alert);
      }
    }
  }
  
  // Record activity for generated alerts
  if (alerts.length > 0) {
    await storage.createActivity({
      timestamp: new Date().toISOString(),
      userId: "system",
      actionType: "create",
      actionDescription: `Generated ${alerts.length} alerts based on risk analysis`,
      status: "completed",
      metadata: { alertCount: alerts.length }
    });
  }
  
  return alerts;
}

/**
 * Processes a transaction and generates alerts if needed
 * 
 * @param transaction Transaction to process
 * @returns Generated alert if applicable
 */
export async function processTransactionForAlerts(transaction: Transaction): Promise<Alert | null> {
  // Calculate risk score if not already set
  if (!transaction.riskScore) {
    const riskScore = calculateRiskScore(transaction);
    transaction = {
      ...transaction,
      riskScore,
      riskLevel: getRiskLevel(riskScore)
    };
  }
  
  // Generate alert for high-risk transactions
  if (transaction.riskScore >= 70) {
    const alertData: InsertAlert = {
      entityId: transaction.sourceEntityId,
      transactionId: transaction.id,
      timestamp: new Date().toISOString(),
      type: "transaction_pattern",
      title: `High Risk Transaction Detected (Score: ${transaction.riskScore})`,
      description: `Unusual transaction pattern detected for transaction ${transaction.id} from ${transaction.sourceEntityId} to ${transaction.destinationEntityId}. Amount: ${transaction.amount} ${transaction.currency}`,
      riskScore: transaction.riskScore,
      riskLevel: transaction.riskLevel,
      status: "pending",
      detectionMethod: "Real-time Transaction Monitoring"
    };
    
    return storage.createAlert(alertData);
  }
  
  return null;
}

/**
 * Get risk level string from a numeric score
 */
function getRiskLevel(score: number): "low" | "medium" | "high" | "critical" {
  if (score >= 85) return "critical";
  if (score >= 70) return "high"; 
  if (score >= 40) return "medium";
  return "low";
}

/**
 * Retrieves alerts filtered by various criteria
 */
export async function getFilteredAlerts(options: {
  timeRange?: string;
  startDate?: Date;
  endDate?: Date;
  riskLevel?: string;
  status?: string;
  limit?: number;
}): Promise<Alert[]> {
  const allAlerts = await storage.getAllAlerts();
  
  return allAlerts.filter(alert => {
    // Filter by risk level
    if (options.riskLevel && options.riskLevel !== "all" && alert.riskLevel !== options.riskLevel) {
      return false;
    }
    
    // Filter by status
    if (options.status && options.status !== "all" && alert.status !== options.status) {
      return false;
    }
    
    // Filter by time range
    const alertDate = new Date(alert.timestamp);
    
    if (options.timeRange === "24h") {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      if (alertDate < oneDayAgo) {
        return false;
      }
    } else if (options.timeRange === "7d") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      if (alertDate < sevenDaysAgo) {
        return false;
      }
    } else if (options.timeRange === "30d") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (alertDate < thirtyDaysAgo) {
        return false;
      }
    } else if (options.startDate && options.endDate) {
      if (alertDate < options.startDate || alertDate > options.endDate) {
        return false;
      }
    }
    
    return true;
  })
  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  .slice(0, options.limit || Infinity);
}

/**
 * Get priority alerts (highest risk, newest alerts)
 */
export async function getPriorityAlerts(limit: number = 5): Promise<Alert[]> {
  const allAlerts = await storage.getAllAlerts();
  
  return allAlerts
    .filter(alert => alert.status === "pending") // Only pending alerts
    .sort((a, b) => {
      // First sort by risk score (high to low)
      if (b.riskScore !== a.riskScore) {
        return b.riskScore - a.riskScore;
      }
      // Then sort by timestamp (newest first)
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    })
    .slice(0, limit);
}
