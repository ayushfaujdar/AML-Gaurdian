import { Transaction } from "@shared/schema";
import { DetectedPattern } from "../../client/src/types";
import { generateId } from "../../client/src/lib/utils";

/**
 * Implementation of a simplified transaction pattern recognition model
 * In a real-world scenario, this would be implemented using a more sophisticated
 * machine learning model trained on labeled historical data.
 */
export function transactionPatternRecognition(
  transactions: Transaction[]
): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  
  // Sort transactions by timestamp
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  // Detect structured deposits (multiple transactions just under reporting threshold)
  const structuredDeposits = detectStructuredDeposits(sortedTransactions);
  if (structuredDeposits.transactionIds.length > 0) {
    patterns.push(structuredDeposits);
  }
  
  // Detect round-trip transactions (funds that circulate through multiple entities)
  const roundTripTransactions = detectRoundTripTransactions(sortedTransactions);
  if (roundTripTransactions.transactionIds.length > 0) {
    patterns.push(roundTripTransactions);
  }
  
  // Detect layering attempts (multiple transactions to obscure source of funds)
  const layeringAttempts = detectLayeringAttempts(sortedTransactions);
  if (layeringAttempts.transactionIds.length > 0) {
    patterns.push(layeringAttempts);
  }
  
  return patterns;
}

/**
 * Detect structured deposits (transactions designed to avoid reporting thresholds)
 * This is a common money laundering technique where multiple smaller transactions
 * are made instead of a single large one to avoid regulatory reporting thresholds.
 */
function detectStructuredDeposits(transactions: Transaction[]): DetectedPattern {
  // Reporting threshold is typically $10,000 in many jurisdictions
  const REPORTING_THRESHOLD = 10000;
  const THRESHOLD_BUFFER = 1000; // Transactions within this buffer of the threshold are suspicious
  const TIME_WINDOW_HOURS = 48; // Look for multiple transactions within this time window
  
  const suspiciousTransactions: Transaction[] = [];
  const entityTransactions = new Map<string, Transaction[]>();
  
  // Group transactions by entity
  transactions.forEach(tx => {
    if (!entityTransactions.has(tx.destinationEntityId)) {
      entityTransactions.set(tx.destinationEntityId, []);
    }
    entityTransactions.get(tx.destinationEntityId)!.push(tx);
  });
  
  // Check each entity for structured deposits
  entityTransactions.forEach((entityTxs, entityId) => {
    // Sort by timestamp
    entityTxs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    // Check for multiple transactions just under the threshold
    for (let i = 0; i < entityTxs.length; i++) {
      const tx = entityTxs[i];
      
      // Check if transaction amount is just under the reporting threshold
      if (tx.amount >= REPORTING_THRESHOLD - THRESHOLD_BUFFER && tx.amount < REPORTING_THRESHOLD) {
        const txTime = new Date(tx.timestamp).getTime();
        
        // Look for additional transactions within the time window
        const relatedTxs = entityTxs.filter(otherTx => {
          const otherTime = new Date(otherTx.timestamp).getTime();
          const hoursDiff = Math.abs(otherTime - txTime) / (1000 * 60 * 60);
          
          return (
            otherTx.id !== tx.id &&
            hoursDiff <= TIME_WINDOW_HOURS &&
            otherTx.amount >= REPORTING_THRESHOLD - THRESHOLD_BUFFER && 
            otherTx.amount < REPORTING_THRESHOLD
          );
        });
        
        // If we found multiple related transactions, flag as structured deposits
        if (relatedTxs.length > 0) {
          suspiciousTransactions.push(tx, ...relatedTxs);
        }
      }
    }
  });
  
  // Remove duplicates
  const uniqueTransactions = Array.from(new Set(suspiciousTransactions.map(tx => tx.id)))
    .map(id => suspiciousTransactions.find(tx => tx.id === id))
    .filter(Boolean) as Transaction[];
  
  // Extract entity IDs
  const entityIds = Array.from(new Set([
    ...uniqueTransactions.map(tx => tx.sourceEntityId),
    ...uniqueTransactions.map(tx => tx.destinationEntityId)
  ]));
  
  return {
    id: generateId("PTN"),
    name: "Structured Deposits",
    description: "Multiple deposits under reporting threshold within 48 hours",
    riskLevel: "high",
    entityIds,
    transactionIds: uniqueTransactions.map(tx => tx.id)
  };
}

/**
 * Detect round-trip transactions (funds that circulate through multiple entities)
 * This is a money laundering technique where funds are moved through multiple entities
 * and eventually return to the original source or a related entity.
 */
function detectRoundTripTransactions(transactions: Transaction[]): DetectedPattern {
  const TIME_WINDOW_DAYS = 7; // Look for round-trip transactions within this time window
  const MAX_CHAIN_LENGTH = 5; // Maximum number of transactions in the chain
  
  // Build directed graph of money flow
  const transactionGraph = new Map<string, Map<string, Transaction[]>>();
  
  // Initialize graph
  transactions.forEach(tx => {
    if (!transactionGraph.has(tx.sourceEntityId)) {
      transactionGraph.set(tx.sourceEntityId, new Map());
    }
    
    const sourceNode = transactionGraph.get(tx.sourceEntityId)!;
    if (!sourceNode.has(tx.destinationEntityId)) {
      sourceNode.set(tx.destinationEntityId, []);
    }
    
    sourceNode.get(tx.destinationEntityId)!.push(tx);
  });
  
  // Find paths that lead back to the original entity
  const roundTripChains: Transaction[][] = [];
  
  // For each entity, look for paths that lead back to it
  transactionGraph.forEach((_, startEntityId) => {
    // Use DFS to find cycles in the transaction graph
    findRoundTrips(startEntityId, startEntityId, [], new Set(), TIME_WINDOW_DAYS, MAX_CHAIN_LENGTH);
  });
  
  // Helper function to find round-trips using DFS
  function findRoundTrips(
    startEntityId: string,
    currentEntityId: string,
    currentPath: Transaction[],
    visited: Set<string>,
    timeWindowDays: number,
    maxChainLength: number
  ) {
    // If we've reached the maximum chain length, stop
    if (currentPath.length >= maxChainLength) {
      return;
    }
    
    // Skip if this entity has no outgoing transactions
    if (!transactionGraph.has(currentEntityId)) {
      return;
    }
    
    // Check transactions from the current entity
    transactionGraph.get(currentEntityId)!.forEach((txs, nextEntityId) => {
      // If we're back at the starting entity and have at least 2 transactions, we found a cycle
      if (nextEntityId === startEntityId && currentPath.length >= 2) {
        // Check if the time between first and last transaction is within the window
        const lastTx = txs[0]; // Simplified - would need to check all txs in an actual implementation
        const firstTxTime = new Date(currentPath[0].timestamp).getTime();
        const lastTxTime = new Date(lastTx.timestamp).getTime();
        const daysDiff = Math.abs(lastTxTime - firstTxTime) / (1000 * 60 * 60 * 24);
        
        if (daysDiff <= timeWindowDays) {
          roundTripChains.push([...currentPath, lastTx]);
        }
        return;
      }
      
      // Skip if we've already visited this entity in the current path
      if (visited.has(nextEntityId)) {
        return;
      }
      
      // Process each transaction to the next entity
      txs.forEach(tx => {
        // Check if the time window is still valid
        if (currentPath.length > 0) {
          const firstTxTime = new Date(currentPath[0].timestamp).getTime();
          const currentTxTime = new Date(tx.timestamp).getTime();
          const daysDiff = Math.abs(currentTxTime - firstTxTime) / (1000 * 60 * 60 * 24);
          
          if (daysDiff > timeWindowDays) {
            return; // Skip this transaction as it's outside the time window
          }
        }
        
        // Add this entity to visited and this transaction to the path
        visited.add(nextEntityId);
        currentPath.push(tx);
        
        // Continue the search
        findRoundTrips(startEntityId, nextEntityId, currentPath, visited, timeWindowDays, maxChainLength);
        
        // Backtrack
        currentPath.pop();
        visited.delete(nextEntityId);
      });
    });
  }
  
  // If we found any round-trip chains, create a detected pattern
  if (roundTripChains.length > 0) {
    // Flatten all transactions and remove duplicates
    const allTransactions = roundTripChains.flat();
    const uniqueTransactionIds = Array.from(new Set(allTransactions.map(tx => tx.id)));
    
    // Extract entity IDs
    const entityIds = Array.from(new Set([
      ...allTransactions.map(tx => tx.sourceEntityId),
      ...allTransactions.map(tx => tx.destinationEntityId)
    ]));
    
    return {
      id: generateId("PTN"),
      name: "Round-Trip Transactions",
      description: "Funds cycling through multiple entities and returning to source",
      riskLevel: "medium",
      entityIds,
      transactionIds: uniqueTransactionIds
    };
  }
  
  // Return empty pattern if none found
  return {
    id: generateId("PTN"),
    name: "Round-Trip Transactions",
    description: "Funds cycling through multiple entities and returning to source",
    riskLevel: "medium",
    entityIds: [],
    transactionIds: []
  };
}

/**
 * Detect layering attempts (complex transaction chains obscuring source of funds)
 * This is a money laundering technique where funds are moved through many transactions
 * to hide their original source.
 */
function detectLayeringAttempts(transactions: Transaction[]): DetectedPattern {
  const TIME_WINDOW_HOURS = 72; // Look for layering within this time window
  const MIN_CHAIN_LENGTH = 3; // Minimum number of transactions in the chain
  const SIMILAR_AMOUNT_THRESHOLD = 0.1; // 10% difference allowed between amounts
  
  // Group transactions by source entity
  const transactionsBySource = new Map<string, Transaction[]>();
  transactions.forEach(tx => {
    if (!transactionsBySource.has(tx.sourceEntityId)) {
      transactionsBySource.set(tx.sourceEntityId, []);
    }
    transactionsBySource.get(tx.sourceEntityId)!.push(tx);
  });
  
  // Find transaction chains
  const layeringChains: Transaction[][] = [];
  
  // For each source entity, look for chains of transactions
  transactionsBySource.forEach((sourceTxs, sourceEntityId) => {
    sourceTxs.forEach(initialTx => {
      const chain = [initialTx];
      extendChain(chain, initialTx.destinationEntityId, initialTx.amount, new Date(initialTx.timestamp).getTime());
    });
  });
  
  // Recursively extend the chain
  function extendChain(
    currentChain: Transaction[],
    currentEntityId: string,
    initialAmount: number,
    startTime: number
  ) {
    // Stop if we don't have transactions for this entity
    if (!transactionsBySource.has(currentEntityId)) {
      return;
    }
    
    // Look for next transactions in the chain
    const nextTransactions = transactionsBySource.get(currentEntityId)!.filter(tx => {
      const txTime = new Date(tx.timestamp).getTime();
      const hoursDiff = (txTime - startTime) / (1000 * 60 * 60);
      
      // Must be after the last transaction in our chain but within the time window
      if (hoursDiff <= 0 || hoursDiff > TIME_WINDOW_HOURS) {
        return false;
      }
      
      // Check if the amount is similar to the initial amount (within threshold)
      const amountDiff = Math.abs(tx.amount - initialAmount) / initialAmount;
      return amountDiff <= SIMILAR_AMOUNT_THRESHOLD;
    });
    
    // If no next transactions, check if we have a valid chain
    if (nextTransactions.length === 0) {
      if (currentChain.length >= MIN_CHAIN_LENGTH) {
        layeringChains.push([...currentChain]);
      }
      return;
    }
    
    // Try each next transaction
    nextTransactions.forEach(nextTx => {
      // Avoid cycles
      if (currentChain.some(tx => tx.destinationEntityId === nextTx.destinationEntityId)) {
        return;
      }
      
      // Extend the chain
      currentChain.push(nextTx);
      
      // If we already have a valid chain, add it
      if (currentChain.length >= MIN_CHAIN_LENGTH) {
        layeringChains.push([...currentChain]);
      }
      
      // Continue extending
      extendChain(currentChain, nextTx.destinationEntityId, initialAmount, startTime);
      
      // Backtrack
      currentChain.pop();
    });
  }
  
  // If we found any layering chains, create a detected pattern
  if (layeringChains.length > 0) {
    // Flatten all transactions and remove duplicates
    const allTransactions = layeringChains.flat();
    const uniqueTransactionIds = Array.from(new Set(allTransactions.map(tx => tx.id)));
    
    // Extract entity IDs
    const entityIds = Array.from(new Set([
      ...allTransactions.map(tx => tx.sourceEntityId),
      ...allTransactions.map(tx => tx.destinationEntityId)
    ]));
    
    return {
      id: generateId("PTN"),
      name: "Layering Attempt",
      description: "Complex transaction chain obscuring source of funds",
      riskLevel: "high",
      entityIds,
      transactionIds: uniqueTransactionIds
    };
  }
  
  // Return empty pattern if none found
  return {
    id: generateId("PTN"),
    name: "Layering Attempt",
    description: "Complex transaction chain obscuring source of funds",
    riskLevel: "high",
    entityIds: [],
    transactionIds: []
  };
}
