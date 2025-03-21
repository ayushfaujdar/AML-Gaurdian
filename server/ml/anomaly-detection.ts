import { Transaction, Entity } from "@shared/schema";

/**
 * Implementation of a simplified anomaly detection model for AML
 * In a real system, this would use more sophisticated unsupervised learning techniques
 */
export function detectAnomalies(
  transactions: Transaction[],
  entities: Entity[]
) {
  // Group transactions by entity for analysis
  const entityTransactionMap = buildEntityTransactionMap(transactions);
  
  // Analyze transaction patterns for each entity
  const entityAnomalyScores = new Map<string, {
    entity: Entity,
    anomalyScore: number,
    anomalies: Anomaly[]
  }>();
  
  // Get all entity IDs involved in transactions
  const allEntityIds = new Set<string>();
  transactions.forEach(tx => {
    allEntityIds.add(tx.sourceEntityId);
    allEntityIds.add(tx.destinationEntityId);
  });
  
  // Find the entity objects
  const entityMap = new Map<string, Entity>();
  entities.forEach(entity => {
    entityMap.set(entity.id, entity);
  });
  
  // Analyze each entity
  allEntityIds.forEach(entityId => {
    const entity = entityMap.get(entityId);
    if (!entity) return;
    
    const incomingTxs = transactions.filter(tx => tx.destinationEntityId === entityId);
    const outgoingTxs = transactions.filter(tx => tx.sourceEntityId === entityId);
    
    // Detect anomalies for this entity
    const anomalies: Anomaly[] = [];
    
    // Check for velocity anomalies (sudden increase in transaction frequency)
    const velocityAnomalies = detectVelocityAnomalies(incomingTxs, outgoingTxs);
    anomalies.push(...velocityAnomalies);
    
    // Check for volume anomalies (unusual transaction amounts)
    const volumeAnomalies = detectVolumeAnomalies(incomingTxs, outgoingTxs);
    anomalies.push(...volumeAnomalies);
    
    // Check for unusual transaction patterns
    const patternAnomalies = detectPatternAnomalies(incomingTxs, outgoingTxs);
    anomalies.push(...patternAnomalies);
    
    // Check for unusual connections
    const connectionAnomalies = detectConnectionAnomalies(
      entityId, incomingTxs, outgoingTxs, entityMap
    );
    anomalies.push(...connectionAnomalies);
    
    // Calculate overall anomaly score
    const anomalyScore = calculateAnomalyScore(anomalies);
    
    entityAnomalyScores.set(entityId, {
      entity,
      anomalyScore,
      anomalies
    });
  });
  
  // Return entities sorted by anomaly score (highest first)
  return Array.from(entityAnomalyScores.values())
    .sort((a, b) => b.anomalyScore - a.anomalyScore);
}

/**
 * Group transactions by entity for easier analysis
 */
function buildEntityTransactionMap(transactions: Transaction[]) {
  const entityTxMap = new Map<string, {
    incoming: Transaction[],
    outgoing: Transaction[]
  }>();
  
  transactions.forEach(tx => {
    // Source entity
    if (!entityTxMap.has(tx.sourceEntityId)) {
      entityTxMap.set(tx.sourceEntityId, {
        incoming: [],
        outgoing: []
      });
    }
    entityTxMap.get(tx.sourceEntityId)!.outgoing.push(tx);
    
    // Destination entity
    if (!entityTxMap.has(tx.destinationEntityId)) {
      entityTxMap.set(tx.destinationEntityId, {
        incoming: [],
        outgoing: []
      });
    }
    entityTxMap.get(tx.destinationEntityId)!.incoming.push(tx);
  });
  
  return entityTxMap;
}

/**
 * Detect velocity anomalies (sudden increase in transaction frequency)
 */
function detectVelocityAnomalies(
  incomingTxs: Transaction[],
  outgoingTxs: Transaction[]
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  // Group transactions by day
  const incomingByDay = groupTransactionsByDay(incomingTxs);
  const outgoingByDay = groupTransactionsByDay(outgoingTxs);
  
  // Calculate baseline velocity (transactions per day)
  const incomingDays = Object.keys(incomingByDay).length;
  const outgoingDays = Object.keys(outgoingByDay).length;
  
  const totalIncomingTxs = incomingTxs.length;
  const totalOutgoingTxs = outgoingTxs.length;
  
  const avgIncomingPerDay = incomingDays > 0 ? totalIncomingTxs / incomingDays : 0;
  const avgOutgoingPerDay = outgoingDays > 0 ? totalOutgoingTxs / outgoingDays : 0;
  
  // Check for days with significant increases
  Object.entries(incomingByDay).forEach(([day, txs]) => {
    if (txs.length > avgIncomingPerDay * 3 && txs.length >= 3) {
      anomalies.push({
        type: "velocity",
        description: `Unusual spike in incoming transactions on ${day} (${txs.length} vs avg ${avgIncomingPerDay.toFixed(1)})`,
        severity: calculateSeverity(txs.length / avgIncomingPerDay),
        transactions: txs.map(tx => tx.id)
      });
    }
  });
  
  Object.entries(outgoingByDay).forEach(([day, txs]) => {
    if (txs.length > avgOutgoingPerDay * 3 && txs.length >= 3) {
      anomalies.push({
        type: "velocity",
        description: `Unusual spike in outgoing transactions on ${day} (${txs.length} vs avg ${avgOutgoingPerDay.toFixed(1)})`,
        severity: calculateSeverity(txs.length / avgOutgoingPerDay),
        transactions: txs.map(tx => tx.id)
      });
    }
  });
  
  return anomalies;
}

/**
 * Group transactions by day
 */
function groupTransactionsByDay(transactions: Transaction[]) {
  const txsByDay: Record<string, Transaction[]> = {};
  
  transactions.forEach(tx => {
    const date = new Date(tx.timestamp);
    const day = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    
    if (!txsByDay[day]) {
      txsByDay[day] = [];
    }
    
    txsByDay[day].push(tx);
  });
  
  return txsByDay;
}

/**
 * Detect volume anomalies (unusual transaction amounts)
 */
function detectVolumeAnomalies(
  incomingTxs: Transaction[],
  outgoingTxs: Transaction[]
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  // Calculate statistics for incoming transactions
  if (incomingTxs.length > 0) {
    const incomingAmounts = incomingTxs.map(tx => tx.amount);
    const incomingStats = calculateStats(incomingAmounts);
    
    // Check for unusually large incoming transactions (>3 standard deviations from mean)
    incomingTxs.forEach(tx => {
      const zScore = (tx.amount - incomingStats.mean) / (incomingStats.stdDev || 1);
      
      if (zScore > 3) {
        anomalies.push({
          type: "volume",
          description: `Unusually large incoming transaction of ${tx.amount} ${tx.currency} (${zScore.toFixed(1)} std devs above mean)`,
          severity: calculateSeverity(zScore / 3),
          transactions: [tx.id]
        });
      }
    });
  }
  
  // Calculate statistics for outgoing transactions
  if (outgoingTxs.length > 0) {
    const outgoingAmounts = outgoingTxs.map(tx => tx.amount);
    const outgoingStats = calculateStats(outgoingAmounts);
    
    // Check for unusually large outgoing transactions
    outgoingTxs.forEach(tx => {
      const zScore = (tx.amount - outgoingStats.mean) / (outgoingStats.stdDev || 1);
      
      if (zScore > 3) {
        anomalies.push({
          type: "volume",
          description: `Unusually large outgoing transaction of ${tx.amount} ${tx.currency} (${zScore.toFixed(1)} std devs above mean)`,
          severity: calculateSeverity(zScore / 3),
          transactions: [tx.id]
        });
      }
    });
  }
  
  return anomalies;
}

/**
 * Calculate basic statistics for an array of numbers
 */
function calculateStats(values: number[]) {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  return { mean, variance, stdDev };
}

/**
 * Detect unusual transaction patterns
 */
function detectPatternAnomalies(
  incomingTxs: Transaction[],
  outgoingTxs: Transaction[]
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  // Check for fan-in/fan-out patterns
  
  // 1. Fan-in: Many small incoming transactions followed by a large outgoing transaction
  if (incomingTxs.length >= 5 && outgoingTxs.length > 0) {
    // Sort by timestamp
    const sortedIncoming = [...incomingTxs].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    const sortedOutgoing = [...outgoingTxs].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Look for a large outgoing transaction after multiple small incoming ones
    sortedOutgoing.forEach(outTx => {
      const outTxTime = new Date(outTx.timestamp).getTime();
      
      // Find incoming transactions in the 3 days before this outgoing transaction
      const precedingIncoming = sortedIncoming.filter(inTx => {
        const inTxTime = new Date(inTx.timestamp).getTime();
        const hoursDiff = (outTxTime - inTxTime) / (1000 * 60 * 60);
        return hoursDiff >= 0 && hoursDiff <= 72; // Within 3 days
      });
      
      if (precedingIncoming.length >= 5) {
        // Calculate total incoming amount
        const totalIncoming = precedingIncoming.reduce((sum, tx) => sum + tx.amount, 0);
        
        // If outgoing is close to total incoming (consolidation pattern)
        if (Math.abs(outTx.amount - totalIncoming) / totalIncoming < 0.1) {
          anomalies.push({
            type: "pattern",
            description: `Fan-in pattern: ${precedingIncoming.length} incoming transactions consolidated into one outgoing transaction of ${outTx.amount} ${outTx.currency}`,
            severity: Math.min(0.7 + (precedingIncoming.length / 20), 1),  // Higher severity for more incoming transactions
            transactions: [...precedingIncoming.map(tx => tx.id), outTx.id]
          });
        }
      }
    });
  }
  
  // 2. Fan-out: One large incoming transaction followed by many small outgoing transactions
  if (incomingTxs.length > 0 && outgoingTxs.length >= 5) {
    // Sort by timestamp
    const sortedIncoming = [...incomingTxs].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    const sortedOutgoing = [...outgoingTxs].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Look for a large incoming transaction before multiple small outgoing ones
    sortedIncoming.forEach(inTx => {
      const inTxTime = new Date(inTx.timestamp).getTime();
      
      // Find outgoing transactions in the 3 days after this incoming transaction
      const followingOutgoing = sortedOutgoing.filter(outTx => {
        const outTxTime = new Date(outTx.timestamp).getTime();
        const hoursDiff = (outTxTime - inTxTime) / (1000 * 60 * 60);
        return hoursDiff >= 0 && hoursDiff <= 72; // Within 3 days
      });
      
      if (followingOutgoing.length >= 5) {
        // Calculate total outgoing amount
        const totalOutgoing = followingOutgoing.reduce((sum, tx) => sum + tx.amount, 0);
        
        // If incoming is close to total outgoing (distribution pattern)
        if (Math.abs(inTx.amount - totalOutgoing) / inTx.amount < 0.1) {
          anomalies.push({
            type: "pattern",
            description: `Fan-out pattern: One incoming transaction of ${inTx.amount} ${inTx.currency} distributed into ${followingOutgoing.length} outgoing transactions`,
            severity: Math.min(0.7 + (followingOutgoing.length / 20), 1),  // Higher severity for more outgoing transactions
            transactions: [inTx.id, ...followingOutgoing.map(tx => tx.id)]
          });
        }
      }
    });
  }
  
  // 3. Check for round numbers (common in money laundering)
  [...incomingTxs, ...outgoingTxs].forEach(tx => {
    if (tx.amount >= 10000 && tx.amount % 1000 === 0) {
      anomalies.push({
        type: "pattern",
        description: `Suspicious round number transaction of ${tx.amount} ${tx.currency}`,
        severity: 0.5, // Medium severity
        transactions: [tx.id]
      });
    }
  });
  
  return anomalies;
}

/**
 * Detect unusual connections between entities
 */
function detectConnectionAnomalies(
  entityId: string,
  incomingTxs: Transaction[],
  outgoingTxs: Transaction[],
  entityMap: Map<string, Entity>
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  // Get all entities this entity transacts with
  const connectedEntityIds = new Set<string>();
  
  incomingTxs.forEach(tx => connectedEntityIds.add(tx.sourceEntityId));
  outgoingTxs.forEach(tx => connectedEntityIds.add(tx.destinationEntityId));
  
  // Check for transactions with high-risk entities
  const highRiskTransactions: Transaction[] = [];
  
  // Incoming from high-risk entities
  incomingTxs.forEach(tx => {
    const sourceEntity = entityMap.get(tx.sourceEntityId);
    if (sourceEntity && (sourceEntity.riskLevel === "high" || sourceEntity.riskLevel === "critical")) {
      highRiskTransactions.push(tx);
    }
  });
  
  // Outgoing to high-risk entities
  outgoingTxs.forEach(tx => {
    const destEntity = entityMap.get(tx.destinationEntityId);
    if (destEntity && (destEntity.riskLevel === "high" || destEntity.riskLevel === "critical")) {
      highRiskTransactions.push(tx);
    }
  });
  
  if (highRiskTransactions.length > 0) {
    anomalies.push({
      type: "connection",
      description: `Entity has ${highRiskTransactions.length} transactions with high-risk entities`,
      severity: Math.min(0.5 + (highRiskTransactions.length / 10), 1), // Higher severity for more high-risk transactions
      transactions: highRiskTransactions.map(tx => tx.id)
    });
  }
  
  return anomalies;
}

/**
 * Calculate severity of an anomaly (0-1)
 */
function calculateSeverity(ratio: number): number {
  return Math.min(Math.max(0.3, ratio / 5), 1);
}

/**
 * Calculate overall anomaly score based on individual anomalies
 */
function calculateAnomalyScore(anomalies: Anomaly[]): number {
  if (anomalies.length === 0) return 0;
  
  // Calculate weighted score based on anomaly types and severities
  const typeWeights = {
    velocity: 0.8,
    volume: 0.7,
    pattern: 1.0,
    connection: 0.9
  };
  
  let totalScore = 0;
  let maxScore = 0;
  
  anomalies.forEach(anomaly => {
    const weight = typeWeights[anomaly.type as keyof typeof typeWeights] || 0.5;
    totalScore += anomaly.severity * weight;
    maxScore += weight;
  });
  
  // Normalize to 0-100 scale
  return (totalScore / Math.max(maxScore, 1)) * 100;
}

/**
 * Anomaly interface
 */
interface Anomaly {
  type: string;
  description: string;
  severity: number; // 0-1 scale
  transactions: string[];
}
