import { Transaction, Entity, EntityRelationship } from "@/types";
import { 
  generateTransactionFingerprint, 
  calculateRiskScore, 
  detectAnomalousPatterns,
  identifyEntityNetwork,
  evaluateNetworkRisk
} from "@/lib/ml-utils";

/**
 * Analyzes transaction patterns to identify potential money laundering activities
 * 
 * This is a simplified client-side implementation for demo purposes.
 * In a production environment, this would be executed on the server with actual ML models.
 */
export function analyzeTransactionPatterns(transactions: Transaction[]): {
  structuredTransactions: Transaction[];
  roundTripTransactions: Transaction[];
  layeringPatterns: Transaction[];
} {
  // Sort transactions by timestamp
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  // Group transactions by source entity
  const txBySource = new Map<string, Transaction[]>();
  sortedTransactions.forEach(tx => {
    if (!txBySource.has(tx.sourceEntityId)) {
      txBySource.set(tx.sourceEntityId, []);
    }
    txBySource.get(tx.sourceEntityId)!.push(tx);
  });
  
  // Group transactions by destination entity
  const txByDestination = new Map<string, Transaction[]>();
  sortedTransactions.forEach(tx => {
    if (!txByDestination.has(tx.destinationEntityId)) {
      txByDestination.set(tx.destinationEntityId, []);
    }
    txByDestination.get(tx.destinationEntityId)!.push(tx);
  });
  
  // Detect structured transactions (multiple smaller transactions to avoid reporting thresholds)
  const structuredTransactions = detectStructuredTransactions(sortedTransactions);
  
  // Detect round-trip transactions (funds returning to the original source)
  const roundTripTransactions = detectRoundTripTransactions(sortedTransactions, txBySource, txByDestination);
  
  // Detect layering patterns (complex transaction chains to hide source)
  const layeringPatterns = detectLayeringPatterns(sortedTransactions, txBySource);
  
  return {
    structuredTransactions,
    roundTripTransactions,
    layeringPatterns
  };
}

/**
 * Detects transactions that may be structured to avoid reporting thresholds
 */
function detectStructuredTransactions(transactions: Transaction[]): Transaction[] {
  const THRESHOLD = 10000; // Typical reporting threshold
  const BUFFER = 1000; // Buffer amount below threshold
  const TIME_WINDOW = 48 * 60 * 60 * 1000; // 48 hours in milliseconds
  
  const structuredTxs: Transaction[] = [];
  const entityTxMap = new Map<string, Transaction[]>();
  
  // Group transactions by destination entity
  transactions.forEach(tx => {
    if (!entityTxMap.has(tx.destinationEntityId)) {
      entityTxMap.set(tx.destinationEntityId, []);
    }
    entityTxMap.get(tx.destinationEntityId)!.push(tx);
  });
  
  // Analyze each entity's transactions for structuring patterns
  entityTxMap.forEach((entityTxs, entityId) => {
    // Sort by timestamp
    entityTxs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    for (let i = 0; i < entityTxs.length; i++) {
      const tx = entityTxs[i];
      const txTime = new Date(tx.timestamp).getTime();
      
      // Check if this transaction is just below the threshold
      if (tx.amount >= THRESHOLD - BUFFER && tx.amount < THRESHOLD) {
        // Look for other transactions within the time window
        const relatedTxs = entityTxs.filter(otherTx => {
          if (otherTx.id === tx.id) return false;
          
          const otherTime = new Date(otherTx.timestamp).getTime();
          const timeDiff = Math.abs(otherTime - txTime);
          
          return timeDiff <= TIME_WINDOW && 
                 otherTx.amount >= THRESHOLD - BUFFER && 
                 otherTx.amount < THRESHOLD;
        });
        
        if (relatedTxs.length > 0) {
          structuredTxs.push(tx, ...relatedTxs);
        }
      }
    }
  });
  
  // Remove duplicates
  return Array.from(new Set(structuredTxs.map(tx => tx.id)))
    .map(id => structuredTxs.find(tx => tx.id === id))
    .filter(Boolean) as Transaction[];
}

/**
 * Detects round-trip transactions where funds cycle back to the original source
 */
function detectRoundTripTransactions(
  transactions: Transaction[],
  txBySource: Map<string, Transaction[]>,
  txByDestination: Map<string, Transaction[]>
): Transaction[] {
  const roundTripTxs: Transaction[] = [];
  const MAX_STEPS = 5; // Maximum number of transactions in a cycle
  const TIME_WINDOW = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  
  // For each entity, trace potential paths that lead back to it
  const entityIds = new Set([
    ...Array.from(txBySource.keys()), 
    ...Array.from(txByDestination.keys())
  ]);
  
  entityIds.forEach(startEntityId => {
    // Track paths to avoid cycles
    const findCycles = (
      currentEntityId: string,
      currentPath: Transaction[],
      visited: Set<string>,
      depth: number
    ) => {
      // Stop if we reach max depth
      if (depth >= MAX_STEPS) return;
      
      // Get outgoing transactions from current entity
      const outgoingTxs = txBySource.get(currentEntityId) || [];
      
      for (const tx of outgoingTxs) {
        const destEntityId = tx.destinationEntityId;
        
        // If we return to start entity and have at least 2 transactions, we found a cycle
        if (destEntityId === startEntityId && currentPath.length >= 2) {
          // Check if the cycle is within the time window
          const startTime = new Date(currentPath[0].timestamp).getTime();
          const endTime = new Date(tx.timestamp).getTime();
          
          if (endTime - startTime <= TIME_WINDOW) {
            roundTripTxs.push(...currentPath, tx);
          }
          continue;
        }
        
        // Avoid revisiting entities
        if (visited.has(destEntityId)) continue;
        
        // Continue search
        const newVisited = new Set(visited);
        newVisited.add(destEntityId);
        
        findCycles(destEntityId, [...currentPath, tx], newVisited, depth + 1);
      }
    };
    
    findCycles(startEntityId, [], new Set([startEntityId]), 0);
  });
  
  // Remove duplicates
  return Array.from(new Set(roundTripTxs.map(tx => tx.id)))
    .map(id => roundTripTxs.find(tx => tx.id === id))
    .filter(Boolean) as Transaction[];
}

/**
 * Detects layering patterns - complex transaction chains to hide source of funds
 */
function detectLayeringPatterns(
  transactions: Transaction[],
  txBySource: Map<string, Transaction[]>
): Transaction[] {
  const layeringTxs: Transaction[] = [];
  const MIN_CHAIN_LENGTH = 3;
  const TIME_WINDOW = 72 * 60 * 60 * 1000; // 72 hours in milliseconds
  const AMOUNT_VARIANCE = 0.1; // 10% variance in amount allowed
  
  // For each entity, look for chains of transactions
  txBySource.forEach((sourceTxs, sourceEntityId) => {
    sourceTxs.forEach(initialTx => {
      const initialAmount = initialTx.amount;
      const initialTime = new Date(initialTx.timestamp).getTime();
      
      const traceChain = (
        currentEntityId: string,
        currentTime: number,
        currentChain: Transaction[],
        visited: Set<string>
      ) => {
        // Stop if we've visited this entity before
        if (visited.has(currentEntityId)) return;
        
        // Get outgoing transactions from this entity
        const outgoingTxs = txBySource.get(currentEntityId) || [];
        
        // Find transactions within time window and with similar amount
        const candidateTxs = outgoingTxs.filter(tx => {
          const txTime = new Date(tx.timestamp).getTime();
          if (txTime <= currentTime) return false; // Must be later than previous tx
          if (txTime - initialTime > TIME_WINDOW) return false; // Must be within time window
          
          // Amount should be similar to initial amount
          const amountDiff = Math.abs(tx.amount - initialAmount) / initialAmount;
          if (amountDiff > AMOUNT_VARIANCE) return false;
          
          return true;
        });
        
        for (const tx of candidateTxs) {
          const newChain = [...currentChain, tx];
          
          // If chain is long enough, add to results
          if (newChain.length >= MIN_CHAIN_LENGTH) {
            layeringTxs.push(...newChain);
          }
          
          // Continue tracing
          const newVisited = new Set(visited);
          newVisited.add(currentEntityId);
          
          traceChain(tx.destinationEntityId, new Date(tx.timestamp).getTime(), newChain, newVisited);
        }
      };
      
      // Start tracing from the initial transaction
      traceChain(initialTx.destinationEntityId, new Date(initialTx.timestamp).getTime(), [initialTx], new Set());
    });
  });
  
  // Remove duplicates
  return Array.from(new Set(layeringTxs.map(tx => tx.id)))
    .map(id => layeringTxs.find(tx => tx.id === id))
    .filter(Boolean) as Transaction[];
}

/**
 * Analyze entity network to identify suspicious structures and relationships
 * 
 * This is a simplified client-side implementation for demo purposes.
 * In a production environment, this would be executed on the server with actual ML models.
 */
export function analyzeEntityNetwork(
  entities: Entity[],
  relationships: EntityRelationship[]
): {
  shellCompanies: Entity[];
  suspiciousNetworks: { entities: Entity[], risk: number }[];
  centralEntities: { entity: Entity, centrality: number }[];
} {
  // Identify potential shell companies
  const shellCompanies = identifyShellCompanies(entities, relationships);
  
  // Identify suspicious entity networks
  const suspiciousNetworks = identifySuspiciousNetworks(entities, relationships);
  
  // Calculate centrality to identify key entities
  const centralEntities = calculateCentrality(entities, relationships);
  
  return {
    shellCompanies,
    suspiciousNetworks,
    centralEntities
  };
}

/**
 * Identify entities that match patterns typical of shell companies
 */
function identifyShellCompanies(entities: Entity[], relationships: EntityRelationship[]): Entity[] {
  const shellCompanies: Entity[] = [];
  
  // High-risk jurisdictions typically used for shell companies
  const HIGH_RISK_JURISDICTIONS = [
    "Cayman Islands", "British Virgin Islands", "Panama", 
    "Belize", "Seychelles", "Marshall Islands", "Cyprus"
  ];
  
  // Calculate outgoing and incoming relationship counts
  const outgoingCount = new Map<string, number>();
  const incomingCount = new Map<string, number>();
  
  relationships.forEach(rel => {
    outgoingCount.set(rel.sourceEntityId, (outgoingCount.get(rel.sourceEntityId) || 0) + 1);
    incomingCount.set(rel.targetEntityId, (incomingCount.get(rel.targetEntityId) || 0) + 1);
  });
  
  // Consider entities created in the last year as recent
  const ONE_YEAR_AGO = new Date();
  ONE_YEAR_AGO.setFullYear(ONE_YEAR_AGO.getFullYear() - 1);
  
  // Analyze each entity for shell company characteristics
  entities.forEach(entity => {
    let score = 0;
    
    // High-risk jurisdiction
    if (HIGH_RISK_JURISDICTIONS.includes(entity.jurisdiction)) {
      score += 30;
    }
    
    // Recently created
    const registrationDate = new Date(entity.registrationDate);
    if (registrationDate > ONE_YEAR_AGO) {
      score += 20;
    }
    
    // Many outgoing, few incoming relationships
    const outgoing = outgoingCount.get(entity.id) || 0;
    const incoming = incomingCount.get(entity.id) || 0;
    
    if (outgoing > incoming * 3 && outgoing > 2) {
      score += 25;
    }
    
    // Already high risk
    if (entity.riskLevel === "high" || entity.riskLevel === "critical") {
      score += 15;
    }
    
    // Consider it a shell company if score is high enough
    if (score >= 50) {
      shellCompanies.push(entity);
    }
  });
  
  return shellCompanies;
}

/**
 * Identify suspicious networks of entities
 */
function identifySuspiciousNetworks(
  entities: Entity[],
  relationships: EntityRelationship[]
): { entities: Entity[], risk: number }[] {
  // Build a graph of entity relationships
  const graph = new Map<string, Set<string>>();
  
  entities.forEach(entity => {
    graph.set(entity.id, new Set());
  });
  
  relationships.forEach(rel => {
    graph.get(rel.sourceEntityId)?.add(rel.targetEntityId);
    graph.get(rel.targetEntityId)?.add(rel.sourceEntityId);
  });
  
  // Find connected components (networks)
  const visited = new Set<string>();
  const networks: Entity[][] = [];
  
  entities.forEach(entity => {
    if (visited.has(entity.id)) return;
    
    const network: Entity[] = [];
    const queue = [entity.id];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      
      visited.add(current);
      const currentEntity = entities.find(e => e.id === current);
      if (currentEntity) network.push(currentEntity);
      
      const neighbors = graph.get(current) || new Set();
      neighbors.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      });
    }
    
    if (network.length >= 3) {
      networks.push(network);
    }
  });
  
  // Calculate risk score for each network
  return networks.map(networkEntities => {
    // Average risk score
    const avgRisk = networkEntities.reduce((sum, entity) => sum + entity.riskScore, 0) / networkEntities.length;
    
    // Count high-risk entities
    const highRiskCount = networkEntities.filter(
      entity => entity.riskLevel === "high" || entity.riskLevel === "critical"
    ).length;
    
    // High-risk percentage
    const highRiskPercentage = (highRiskCount / networkEntities.length) * 100;
    
    // Network risk score
    const networkRisk = avgRisk * (1 + (highRiskPercentage / 100));
    
    return {
      entities: networkEntities,
      risk: networkRisk
    };
  }).sort((a, b) => b.risk - a.risk); // Sort by risk (highest first)
}

/**
 * Calculate centrality scores to identify key entities in the network
 */
function calculateCentrality(
  entities: Entity[],
  relationships: EntityRelationship[]
): { entity: Entity, centrality: number }[] {
  // For each entity, count its relationships
  const connectionCounts = new Map<string, number>();
  
  relationships.forEach(rel => {
    connectionCounts.set(rel.sourceEntityId, (connectionCounts.get(rel.sourceEntityId) || 0) + 1);
    connectionCounts.set(rel.targetEntityId, (connectionCounts.get(rel.targetEntityId) || 0) + 1);
  });
  
  // Calculate centrality scores
  const centralityScores: { entity: Entity, centrality: number }[] = [];
  
  entities.forEach(entity => {
    const connections = connectionCounts.get(entity.id) || 0;
    
    // Simple centrality measure based on connection count
    // In a real system, would use more sophisticated measures
    const centrality = connections;
    
    centralityScores.push({
      entity,
      centrality
    });
  });
  
  // Sort by centrality (highest first)
  return centralityScores.sort((a, b) => b.centrality - a.centrality);
}
