import { Transaction, Entity, EntityRelationship } from "@/types";

/**
 * Generates a unique fingerprint for a transaction based on its properties
 * This helps in identifying similar transactions or patterns
 */
export function generateTransactionFingerprint(transaction: Transaction): string {
  const components = [
    transaction.sourceEntityId,
    transaction.destinationEntityId,
    transaction.amount.toFixed(2),
    transaction.currency,
    transaction.type,
    transaction.category
  ];
  
  return components.join('|');
}

/**
 * Calculates a risk score for a transaction based on various factors
 * This is a simplified implementation for client-side use
 */
export function calculateRiskScore(transaction: Transaction): number {
  let score = 20; // Base score
  
  // 1. Amount factors
  if (transaction.amount >= 10000) {
    score += Math.min(5 + (transaction.amount - 10000) / 10000, 15);
  }
  
  // 2. Just below reporting threshold
  if (transaction.amount >= 9000 && transaction.amount < 10000) {
    score += 20;
  }
  
  // 3. Cross-border transactions
  if (transaction.category === "cross_border") {
    score += 15;
  }
  
  // 4. Crypto transactions
  if (transaction.category === "crypto") {
    score += 10;
  }
  
  // 5. Round numbers
  if (transaction.amount >= 1000 && transaction.amount % 1000 === 0) {
    score += 5;
  }
  
  // Ensure score is between 0 and 100
  return Math.min(Math.max(score, 0), 100);
}

/**
 * Detects anomalous patterns in a set of transactions
 */
export function detectAnomalousPatterns(transactions: Transaction[]): Transaction[] {
  // Sort transactions by timestamp
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  const anomalies: Transaction[] = [];
  
  // Group transactions by entity
  const entityTransactions = new Map<string, Transaction[]>();
  
  // Add source entity transactions
  sortedTransactions.forEach(tx => {
    if (!entityTransactions.has(tx.sourceEntityId)) {
      entityTransactions.set(tx.sourceEntityId, []);
    }
    entityTransactions.get(tx.sourceEntityId)!.push(tx);
  });
  
  // Add destination entity transactions
  sortedTransactions.forEach(tx => {
    if (!entityTransactions.has(tx.destinationEntityId)) {
      entityTransactions.set(tx.destinationEntityId, []);
    }
    entityTransactions.get(tx.destinationEntityId)!.push(tx);
  });
  
  // Detect velocity anomalies (sudden surge in transaction frequency)
  entityTransactions.forEach((txs, entityId) => {
    // Group by day
    const txsByDay = new Map<string, Transaction[]>();
    
    txs.forEach(tx => {
      const date = new Date(tx.timestamp);
      const day = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      
      if (!txsByDay.has(day)) {
        txsByDay.set(day, []);
      }
      
      txsByDay.get(day)!.push(tx);
    });
    
    // Calculate average transactions per day
    const avgPerDay = txs.length / Math.max(txsByDay.size, 1);
    
    // Identify days with unusually high transaction counts
    txsByDay.forEach((dayTxs, day) => {
      if (dayTxs.length > avgPerDay * 3 && dayTxs.length >= 3) {
        anomalies.push(...dayTxs);
      }
    });
  });
  
  // Detect volume anomalies (unusually large transactions)
  entityTransactions.forEach((txs, entityId) => {
    if (txs.length < 5) return; // Need enough data
    
    // Calculate mean and standard deviation of transaction amounts
    const amounts = txs.map(tx => tx.amount);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    
    const variance = amounts.reduce((sum, amount) => sum + Math.pow(amount - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    
    // Flag transactions with z-score > 3 (more than 3 standard deviations from mean)
    txs.forEach(tx => {
      const zScore = (tx.amount - mean) / (stdDev || 1);
      if (zScore > 3) {
        anomalies.push(tx);
      }
    });
  });
  
  // Remove duplicates before returning
  return Array.from(new Set(anomalies.map(tx => tx.id)))
    .map(id => anomalies.find(tx => tx.id === id))
    .filter(Boolean) as Transaction[];
}

/**
 * Identifies network of related entities based on transaction patterns
 */
export function identifyEntityNetwork(
  centralEntityId: string,
  entities: Entity[],
  relationships: EntityRelationship[],
  transactions: Transaction[],
  maxDepth: number = 2
): Entity[] {
  const network: Entity[] = [];
  const centralEntity = entities.find(e => e.id === centralEntityId);
  
  if (!centralEntity) return network;
  
  network.push(centralEntity);
  
  // Track visited entities to avoid cycles
  const visited = new Set<string>([centralEntityId]);
  
  // Queue for breadth-first search
  const queue: { entityId: string; depth: number }[] = [{ entityId: centralEntityId, depth: 0 }];
  
  while (queue.length > 0) {
    const { entityId, depth } = queue.shift()!;
    
    // Stop if we've reached max depth
    if (depth >= maxDepth) continue;
    
    // Add entities from relationships
    relationships.forEach(rel => {
      let relatedEntityId: string | null = null;
      
      if (rel.sourceEntityId === entityId) {
        relatedEntityId = rel.targetEntityId;
      } else if (rel.targetEntityId === entityId) {
        relatedEntityId = rel.sourceEntityId;
      }
      
      if (relatedEntityId && !visited.has(relatedEntityId)) {
        visited.add(relatedEntityId);
        
        const relatedEntity = entities.find(e => e.id === relatedEntityId);
        if (relatedEntity) {
          network.push(relatedEntity);
          queue.push({ entityId: relatedEntityId, depth: depth + 1 });
        }
      }
    });
    
    // Add entities from transactions
    transactions.forEach(tx => {
      let relatedEntityId: string | null = null;
      
      if (tx.sourceEntityId === entityId) {
        relatedEntityId = tx.destinationEntityId;
      } else if (tx.destinationEntityId === entityId) {
        relatedEntityId = tx.sourceEntityId;
      }
      
      if (relatedEntityId && !visited.has(relatedEntityId)) {
        visited.add(relatedEntityId);
        
        const relatedEntity = entities.find(e => e.id === relatedEntityId);
        if (relatedEntity) {
          network.push(relatedEntity);
          queue.push({ entityId: relatedEntityId, depth: depth + 1 });
        }
      }
    });
  }
  
  return network;
}

/**
 * Evaluates the risk of an entity network
 */
export function evaluateNetworkRisk(network: Entity[]): number {
  if (network.length === 0) return 0;
  
  // Average risk score
  const avgRiskScore = network.reduce((sum, entity) => sum + entity.riskScore, 0) / network.length;
  
  // Count high-risk entities
  const highRiskCount = network.filter(
    entity => entity.riskLevel === "high" || entity.riskLevel === "critical"
  ).length;
  
  // Calculate high-risk percentage
  const highRiskPercentage = (highRiskCount / network.length) * 100;
  
  // Combined risk score
  const networkRisk = avgRiskScore * (1 + (highRiskPercentage / 100));
  
  return Math.min(networkRisk, 100);
}
