import { Transaction, Entity, InsertTransaction } from "@shared/schema";
import { storage } from "../storage";
import { calculateRiskScore } from "../ml/risk-scoring";
import { detectAnomalies } from "../ml/anomaly-detection";
import { transactionPatternRecognition } from "../ml/transaction-pattern";
import { processTransactionForAlerts } from "./alert-service";
import { generateId } from "../../client/src/lib/utils";

/**
 * Analyzes transactions to detect patterns and assign risk scores
 * 
 * @param transactions Transactions to analyze
 * @param entities Entities involved in the transactions
 * @returns Detected patterns and anomalies
 */
export async function analyzeTransactions(
  transactions: Transaction[],
  entities: Entity[]
): Promise<{
  patterns: any;
  anomalies: Transaction[];
  riskyTransactions: Transaction[];
}> {
  // Perform pattern recognition
  const patterns = transactionPatternRecognition(transactions);
  
  // Detect anomalies
  const anomaliesResult = detectAnomalies(transactions, entities);
  
  // Extract anomalous transactions
  const anomalousEntityIds = anomaliesResult.map(result => result.entity.id);
  const anomalies = transactions.filter(tx => 
    anomalousEntityIds.includes(tx.sourceEntityId) || 
    anomalousEntityIds.includes(tx.destinationEntityId)
  );
  
  // Identify high-risk transactions
  const riskyTransactions = transactions.filter(tx => tx.riskScore >= 70);
  
  // Log analysis activity
  await storage.createActivity({
    timestamp: new Date().toISOString(),
    userId: "system",
    actionType: "analyze",
    actionDescription: `Analyzed ${transactions.length} transactions, found ${patterns.length} patterns and ${anomalies.length} anomalies`,
    status: "completed",
    metadata: { 
      transactionCount: transactions.length,
      patternCount: patterns.length,
      anomalyCount: anomalies.length,
      riskyTransactionCount: riskyTransactions.length
    }
  });
  
  return {
    patterns,
    anomalies,
    riskyTransactions
  };
}

/**
 * Processes a new transaction - calculates risk, updates DB, and generates alerts if needed
 * 
 * @param transaction The transaction to process
 * @returns Processed transaction with risk score
 */
export async function processTransaction(transactionData: InsertTransaction): Promise<Transaction> {
  // Calculate risk score for the transaction
  const riskScore = calculateRiskScore(transactionData);
  
  // Determine risk level
  let riskLevel: "low" | "medium" | "high" | "critical" = "low";
  if (riskScore >= 85) {
    riskLevel = "critical";
  } else if (riskScore >= 70) {
    riskLevel = "high";
  } else if (riskScore >= 40) {
    riskLevel = "medium";
  }
  
  // Create the transaction with risk assessment
  const transaction = await storage.createTransaction({
    ...transactionData,
    riskScore,
    riskLevel
  });
  
  // Generate alerts if risk is high enough
  if (riskScore > 70) {
    await processTransactionForAlerts(transaction);
    
    // Log high-risk transaction
    await storage.createActivity({
      timestamp: new Date().toISOString(),
      userId: "system",
      actionType: "detect",
      actionDescription: `Detected high-risk transaction: ${transaction.id} (Score: ${riskScore})`,
      status: "completed",
      metadata: { 
        transactionId: transaction.id,
        riskScore,
        riskLevel,
        amount: transaction.amount,
        currency: transaction.currency,
        sourceEntityId: transaction.sourceEntityId,
        destinationEntityId: transaction.destinationEntityId
      }
    });
  }
  
  return transaction;
}

/**
 * Creates sample transactions for testing
 * This would not be in a production system but is useful for demo purposes
 */
export async function createSampleTransactions(
  entities: Entity[],
  count: number
): Promise<Transaction[]> {
  const transactions: Transaction[] = [];
  
  // Transaction types
  const types = ["deposit", "withdrawal", "transfer", "exchange", "payment"];
  const categories = ["fiat", "crypto", "cross_border"];
  const currencies = ["USD", "EUR", "GBP", "BTC", "ETH"];
  
  for (let i = 0; i < count; i++) {
    // Select random pair of entities
    const sourceIndex = Math.floor(Math.random() * entities.length);
    let destinationIndex = Math.floor(Math.random() * entities.length);
    
    // Ensure different entities
    while (destinationIndex === sourceIndex) {
      destinationIndex = Math.floor(Math.random() * entities.length);
    }
    
    const sourceEntity = entities[sourceIndex];
    const destinationEntity = entities[destinationIndex];
    
    // Generate transaction details
    const typeIndex = Math.floor(Math.random() * types.length);
    const categoryIndex = Math.floor(Math.random() * categories.length);
    const currencyIndex = Math.floor(Math.random() * currencies.length);
    
    // Generate timestamp (up to 30 days ago)
    const timestamp = new Date();
    timestamp.setDate(timestamp.getDate() - Math.floor(Math.random() * 30));
    
    // Generate amount (between $100 and $20,000)
    let amount = 100 + Math.floor(Math.random() * 19900);
    
    // Occasionally generate suspicious amounts
    if (Math.random() > 0.9) {
      // Just below reporting threshold
      amount = 9800 + Math.floor(Math.random() * 199);
    } else if (Math.random() > 0.8) {
      // Large round amount
      amount = Math.floor(Math.random() * 10) * 10000;
    }
    
    // Create description
    const descriptions = [
      "Payment for services",
      "Invoice settlement",
      "Investment transfer",
      "Loan repayment",
      "Consulting fee",
      "Asset purchase",
      "Distribution of funds",
      "Contract payment",
      "Fee payment",
      "Commission"
    ];
    const descriptionIndex = Math.floor(Math.random() * descriptions.length);
    
    const transactionData: InsertTransaction = {
      sourceEntityId: sourceEntity.id,
      destinationEntityId: destinationEntity.id,
      amount,
      currency: currencies[currencyIndex],
      timestamp: timestamp.toISOString(),
      description: descriptions[descriptionIndex],
      type: types[typeIndex] as any,
      category: categories[categoryIndex] as any,
      riskScore: 0, // Will be calculated
      riskLevel: "low", // Will be determined
      metadata: {}
    };
    
    // Process the transaction
    const transaction = await processTransaction(transactionData);
    transactions.push(transaction);
  }
  
  return transactions;
}

/**
 * Gets transaction timeline events for visualization
 */
export async function getTransactionTimeline(
  transactionId: string
): Promise<any[]> {
  const transaction = await storage.getTransaction(transactionId);
  
  if (!transaction) {
    return [];
  }
  
  // Get other transactions involving the same entities
  const sourceEntity = await storage.getEntity(transaction.sourceEntityId);
  const destEntity = await storage.getEntity(transaction.destinationEntityId);
  
  if (!sourceEntity || !destEntity) {
    return [];
  }
  
  // Get related transactions in the same time period
  const allTransactions = await storage.getAllTransactions();
  
  // Filter to get transactions in 3 days before the main transaction
  const mainTxTime = new Date(transaction.timestamp).getTime();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  
  const relatedTxs = allTransactions.filter(tx => {
    const txTime = new Date(tx.timestamp).getTime();
    const timeDiff = mainTxTime - txTime;
    
    // Include transactions from 3 days before up to the main transaction
    return timeDiff >= 0 && 
           timeDiff <= threeDaysMs && 
           (tx.sourceEntityId === transaction.sourceEntityId || 
            tx.sourceEntityId === transaction.destinationEntityId ||
            tx.destinationEntityId === transaction.sourceEntityId ||
            tx.destinationEntityId === transaction.destinationEntityId);
  });
  
  // Sort by timestamp
  const sortedTxs = [...relatedTxs, transaction].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  // Create timeline events
  return sortedTxs.map(tx => {
    const isSameAsFlagged = tx.id === transaction.id;
    
    // Determine direction relative to the entity we're focusing on
    // For simplicity, we'll focus on the source entity of the main transaction
    const focusEntityId = transaction.sourceEntityId;
    let direction: 'incoming' | 'outgoing';
    let entity: string;
    let entityId: string;
    
    if (tx.sourceEntityId === focusEntityId) {
      direction = 'outgoing';
      entity = tx.destinationEntityId;
      entityId = tx.destinationEntityId;
    } else {
      direction = 'incoming';
      entity = tx.sourceEntityId;
      entityId = tx.sourceEntityId;
    }
    
    return {
      id: tx.id,
      transactionId: tx.id,
      amount: tx.amount,
      currency: tx.currency,
      direction,
      timestamp: tx.timestamp,
      entity,
      entityId,
      description: tx.description,
      isFlagged: isSameAsFlagged,
      flagReason: isSameAsFlagged ? 
        `${tx.riskLevel.charAt(0).toUpperCase() + tx.riskLevel.slice(1)} Risk Transaction` : 
        undefined
    };
  });
}
