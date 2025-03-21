import * as tf from '@tensorflow/tfjs-node';
import { Transaction, Entity } from '@shared/schema';

/**
 * Deep Learning Model for Transaction Pattern Detection
 * 
 * This model uses a sequence model (LSTM) to identify specific money laundering patterns
 * in transaction sequences, such as structuring, round-trip transactions, and smurfing.
 */
export class TransactionPatternModel {
  private model: tf.LayersModel | null = null;
  private patterns: Map<string, tf.LayersModel> = new Map();
  private patternThresholds: Map<string, number> = new Map();
  
  // Supported pattern types
  private readonly PATTERNS = [
    'structuring',
    'round_trip',
    'layering',
    'smurfing',
    'trade_based'
  ];
  
  // Sequence length for transaction sequences
  private readonly SEQUENCE_LENGTH = 10;
  
  // Features for transaction sequences
  private readonly FEATURE_COUNT = 7;
  
  constructor() {}
  
  /**
   * Build the LSTM model for sequence classification
   */
  private buildModel(patternName: string): tf.LayersModel {
    const model = tf.sequential();
    
    // Input layer for sequence data
    model.add(tf.layers.lstm({
      units: 64,
      inputShape: [this.SEQUENCE_LENGTH, this.FEATURE_COUNT],
      returnSequences: true
    }));
    
    model.add(tf.layers.dropout({ rate: 0.2 }));
    
    model.add(tf.layers.lstm({
      units: 32,
      returnSequences: false
    }));
    
    model.add(tf.layers.dropout({ rate: 0.2 }));
    
    model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    
    // Binary classification - is this pattern present or not
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
    
    // Compile model
    model.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
    
    return model;
  }
  
  /**
   * Generate synthetic training data for a specific pattern
   */
  private generateSyntheticData(
    patternName: string,
    transactions: Transaction[],
    entities: Entity[]
  ): {
    sequences: number[][][];
    labels: number[][];
  } {
    // Create balanced dataset with positive and negative examples
    const sequences: number[][][] = [];
    const labels: number[][] = [];
    
    // Generate positive examples (with pattern)
    const positiveExamples = this.generatePositiveExamples(patternName, transactions, entities);
    sequences.push(...positiveExamples.sequences);
    labels.push(...positiveExamples.labels);
    
    // Generate negative examples (without pattern)
    const numNegativeNeeded = positiveExamples.sequences.length;
    const negativeExamples = this.generateNegativeExamples(
      patternName, transactions, entities, numNegativeNeeded
    );
    sequences.push(...negativeExamples.sequences);
    labels.push(...negativeExamples.labels);
    
    return { sequences, labels };
  }
  
  /**
   * Generate positive examples for the given pattern
   */
  private generatePositiveExamples(
    patternName: string,
    transactions: Transaction[],
    entities: Entity[]
  ): {
    sequences: number[][][];
    labels: number[][];
  } {
    const sequences: number[][][] = [];
    const labels: number[][] = [];
    
    // Sort transactions by timestamp
    const sortedTransactions = [...transactions].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    switch (patternName) {
      case 'structuring':
        // Structuring pattern: multiple small transactions just below reporting threshold
        this.generateStructuringExamples(sortedTransactions, entities, sequences, labels);
        break;
        
      case 'round_trip':
        // Round-trip pattern: funds that circulate back to originator
        this.generateRoundTripExamples(sortedTransactions, entities, sequences, labels);
        break;
        
      case 'layering':
        // Layering: funds passing through multiple entities
        this.generateLayeringExamples(sortedTransactions, entities, sequences, labels);
        break;
        
      case 'smurfing':
        // Smurfing: multiple small deposits by different people to the same account
        this.generateSmurfingExamples(sortedTransactions, entities, sequences, labels);
        break;
        
      case 'trade_based':
        // Trade-based money laundering: over/under-invoicing
        this.generateTradeBasedExamples(sortedTransactions, entities, sequences, labels);
        break;
    }
    
    return { sequences, labels };
  }
  
  /**
   * Generate structuring pattern examples
   */
  private generateStructuringExamples(
    transactions: Transaction[],
    entities: Entity[],
    sequences: number[][][],
    labels: number[][]
  ): void {
    // For structuring, we look for multiple small transactions just below reporting threshold
    const REPORTING_THRESHOLD = 10000; // Example threshold
    const STRUCTURING_THRESHOLD = REPORTING_THRESHOLD * 0.9; // 90% of reporting threshold
    
    // Group transactions by destination entity
    const txByDestination = new Map<string, Transaction[]>();
    
    transactions.forEach(tx => {
      const destTxs = txByDestination.get(tx.destinationEntityId) || [];
      destTxs.push(tx);
      txByDestination.set(tx.destinationEntityId, destTxs);
    });
    
    // Find entities with multiple transactions just below threshold
    txByDestination.forEach((entityTxs, entityId) => {
      // Sort by timestamp
      entityTxs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      // Look for clusters of transactions below threshold in a short time period
      const timeWindowMs = 7 * 24 * 60 * 60 * 1000; // 7 days
      
      for (let i = 0; i < entityTxs.length; i++) {
        const windowTxs: Transaction[] = [];
        const startTime = new Date(entityTxs[i].timestamp).getTime();
        
        // Find transactions within time window
        for (let j = i; j < entityTxs.length; j++) {
          const txTime = new Date(entityTxs[j].timestamp).getTime();
          if (txTime - startTime <= timeWindowMs) {
            windowTxs.push(entityTxs[j]);
          } else {
            break;
          }
        }
        
        // Check if we have enough transactions in the window
        if (windowTxs.length >= 3) {
          // Check if all are below threshold but sum is above
          const allBelowThreshold = windowTxs.every(tx => tx.amount < REPORTING_THRESHOLD && tx.amount > STRUCTURING_THRESHOLD);
          const sumAboveThreshold = windowTxs.reduce((sum, tx) => sum + tx.amount, 0) > REPORTING_THRESHOLD;
          
          if (allBelowThreshold && sumAboveThreshold) {
            // We found a potential structuring pattern
            const sequence = this.transactionsToSequence(windowTxs, entities);
            sequences.push(sequence);
            labels.push([1]); // Positive example
            
            // Skip ahead to avoid overlapping sequences
            i += windowTxs.length - 1;
          }
        }
      }
    });
    
    // If we didn't find enough natural examples, create synthetic ones
    const minExamples = 10;
    if (sequences.length < minExamples) {
      const numSyntheticNeeded = minExamples - sequences.length;
      
      for (let i = 0; i < numSyntheticNeeded; i++) {
        // Create a synthetic structuring pattern
        const syntheticTxs: Transaction[] = [];
        
        // Random destination entity
        const destEntityIdx = Math.floor(Math.random() * entities.length);
        const destEntityId = entities[destEntityIdx].id;
        
        // Create 3-5 transactions just below threshold
        const numTxs = 3 + Math.floor(Math.random() * 3);
        const baseTime = new Date().getTime() - 30 * 24 * 60 * 60 * 1000; // 30 days ago
        
        for (let j = 0; j < numTxs; j++) {
          // Amount just below threshold
          const amount = STRUCTURING_THRESHOLD - Math.random() * 1000;
          
          // Random source entity (different from destination)
          let sourceEntityIdx = Math.floor(Math.random() * entities.length);
          while (sourceEntityIdx === destEntityIdx) {
            sourceEntityIdx = Math.floor(Math.random() * entities.length);
          }
          const sourceEntityId = entities[sourceEntityIdx].id;
          
          // Timestamp within a few days
          const timestamp = new Date(baseTime + j * 24 * 60 * 60 * 1000).toISOString();
          
          syntheticTxs.push({
            id: `ST-${i}-${j}`,
            sourceEntityId,
            destinationEntityId: destEntityId,
            amount,
            currency: 'USD',
            timestamp,
            description: 'Payment',
            type: 'transfer',
            category: 'fiat',
            riskScore: 50,
            riskLevel: 'medium'
          });
        }
        
        // Convert to sequence
        const sequence = this.transactionsToSequence(syntheticTxs, entities);
        sequences.push(sequence);
        labels.push([1]); // Positive example
      }
    }
  }
  
  /**
   * Generate round-trip transaction examples
   */
  private generateRoundTripExamples(
    transactions: Transaction[],
    entities: Entity[],
    sequences: number[][][],
    labels: number[][]
  ): void {
    // For round-trip, we look for funds that circle back to the original source
    
    // Build transaction graph
    const txGraph = new Map<string, Map<string, Transaction[]>>();
    
    entities.forEach(entity => {
      txGraph.set(entity.id, new Map());
    });
    
    transactions.forEach(tx => {
      const srcTxs = txGraph.get(tx.sourceEntityId);
      if (srcTxs) {
        const destTxs = srcTxs.get(tx.destinationEntityId) || [];
        destTxs.push(tx);
        srcTxs.set(tx.destinationEntityId, destTxs);
      }
    });
    
    // Find round-trip paths (e.g., A -> B -> C -> A)
    const findRoundTrips = (
      start: string,
      current: string,
      path: string[] = [],
      txPath: Transaction[] = []
    ): { entities: string[], transactions: Transaction[] }[] => {
      // If we've returned to start, we found a round trip
      if (current === start && path.length >= 3) {
        return [{ entities: [...path, start], transactions: txPath }];
      }
      
      // If we've already visited current node, stop this branch
      if (path.includes(current) && current !== start) {
        return [];
      }
      
      // Add current to path
      path.push(current);
      
      // Continue DFS
      const results: { entities: string[], transactions: Transaction[] }[] = [];
      const destinations = txGraph.get(current);
      
      if (!destinations) return results;
      
      destinations.forEach((txs, dest) => {
        // For round trips, we need to find paths back to start
        if (dest === start && path.length >= 2) {
          // Find a representative transaction
          const tx = txs[0];
          results.push({
            entities: [...path, start],
            transactions: [...txPath, tx]
          });
        } else if (!path.includes(dest) || dest === start) {
          // Follow the path
          txs.forEach(tx => {
            const newResults = findRoundTrips(
              start,
              dest,
              [...path],
              [...txPath, tx]
            );
            results.push(...newResults);
          });
        }
      });
      
      return results;
    };
    
    // Search for round trips
    const roundTrips = new Set<string>(); // To avoid duplicates
    
    entities.forEach(entity => {
      const trips = findRoundTrips(entity.id, entity.id);
      
      trips.forEach(trip => {
        const tripKey = trip.entities.join('->');
        
        if (!roundTrips.has(tripKey) && trip.transactions.length >= 3) {
          roundTrips.add(tripKey);
          
          // Convert to sequence
          const sequence = this.transactionsToSequence(trip.transactions, entities);
          sequences.push(sequence);
          labels.push([1]); // Positive example
        }
      });
    });
    
    // If we didn't find enough examples, create synthetic ones
    const minExamples = 10;
    if (sequences.length < minExamples) {
      const numSyntheticNeeded = minExamples - sequences.length;
      
      for (let i = 0; i < numSyntheticNeeded; i++) {
        // Create a synthetic round-trip pattern
        const syntheticTxs: Transaction[] = [];
        
        // Select 3-5 entities for the round trip
        const numEntities = 3 + Math.floor(Math.random() * 3);
        const entityIndices: number[] = [];
        
        // Select first entity
        entityIndices.push(Math.floor(Math.random() * entities.length));
        
        // Select remaining entities
        for (let j = 1; j < numEntities; j++) {
          let newEntityIdx = Math.floor(Math.random() * entities.length);
          
          // Ensure we don't pick the same entity twice
          while (entityIndices.includes(newEntityIdx)) {
            newEntityIdx = Math.floor(Math.random() * entities.length);
          }
          
          entityIndices.push(newEntityIdx);
        }
        
        // Create transactions in a round-trip pattern
        const baseAmount = 10000 + Math.random() * 90000;
        const baseTime = new Date().getTime() - 30 * 24 * 60 * 60 * 1000; // 30 days ago
        
        for (let j = 0; j < numEntities; j++) {
          const sourceIdx = j;
          const destIdx = (j + 1) % numEntities;
          
          const sourceEntityId = entities[entityIndices[sourceIdx]].id;
          const destEntityId = entities[entityIndices[destIdx]].id;
          
          // Each transaction has slightly different amount (within 5%)
          const variation = (Math.random() * 0.1) - 0.05; // -5% to +5%
          const amount = baseAmount * (1 + variation);
          
          // Timestamp progressing by a few days each step
          const timestamp = new Date(baseTime + j * 2 * 24 * 60 * 60 * 1000).toISOString();
          
          syntheticTxs.push({
            id: `RT-${i}-${j}`,
            sourceEntityId,
            destinationEntityId: destEntityId,
            amount,
            currency: 'USD',
            timestamp,
            description: 'Transfer',
            type: 'transfer',
            category: 'fiat',
            riskScore: 70,
            riskLevel: 'high'
          });
        }
        
        // Convert to sequence
        const sequence = this.transactionsToSequence(syntheticTxs, entities);
        sequences.push(sequence);
        labels.push([1]); // Positive example
      }
    }
  }
  
  /**
   * Generate layering transaction examples
   */
  private generateLayeringExamples(
    transactions: Transaction[],
    entities: Entity[],
    sequences: number[][][],
    labels: number[][]
  ): void {
    // For layering, we look for funds passing through multiple intermediate entities
    
    // Build transaction graph
    const txGraph = new Map<string, Map<string, Transaction[]>>();
    
    entities.forEach(entity => {
      txGraph.set(entity.id, new Map());
    });
    
    transactions.forEach(tx => {
      const srcTxs = txGraph.get(tx.sourceEntityId);
      if (srcTxs) {
        const destTxs = srcTxs.get(tx.destinationEntityId) || [];
        destTxs.push(tx);
        srcTxs.set(tx.destinationEntityId, destTxs);
      }
    });
    
    // Find long paths through the transaction graph
    const findPaths = (
      start: string,
      visited: Set<string> = new Set(),
      path: string[] = [],
      txPath: Transaction[] = []
    ): { entities: string[], transactions: Transaction[] }[] => {
      if (visited.has(start)) return [];
      
      visited.add(start);
      path.push(start);
      
      // If path is long enough, it's a potential layering pattern
      if (path.length >= 4) {
        return [{ entities: [...path], transactions: [...txPath] }];
      }
      
      // Continue DFS
      const results: { entities: string[], transactions: Transaction[] }[] = [];
      const destinations = txGraph.get(start);
      
      if (!destinations) return results;
      
      destinations.forEach((txs, dest) => {
        if (!visited.has(dest)) {
          txs.forEach(tx => {
            const newResults = findPaths(
              dest,
              new Set(visited),
              [...path],
              [...txPath, tx]
            );
            results.push(...newResults);
          });
        }
      });
      
      return results;
    };
    
    // Search for layering paths
    const layeringPaths = new Set<string>(); // To avoid duplicates
    
    entities.forEach(entity => {
      const paths = findPaths(entity.id);
      
      paths.forEach(path => {
        const pathKey = path.entities.join('->');
        
        if (!layeringPaths.has(pathKey) && path.transactions.length >= 3) {
          layeringPaths.add(pathKey);
          
          // Convert to sequence
          const sequence = this.transactionsToSequence(path.transactions, entities);
          sequences.push(sequence);
          labels.push([1]); // Positive example
        }
      });
    });
    
    // If we didn't find enough examples, create synthetic ones
    const minExamples = 10;
    if (sequences.length < minExamples) {
      const numSyntheticNeeded = minExamples - sequences.length;
      
      for (let i = 0; i < numSyntheticNeeded; i++) {
        // Create a synthetic layering pattern
        const syntheticTxs: Transaction[] = [];
        
        // Select 4-6 entities for the layering
        const numEntities = 4 + Math.floor(Math.random() * 3);
        const entityIndices: number[] = [];
        
        // Select first entity
        entityIndices.push(Math.floor(Math.random() * entities.length));
        
        // Select remaining entities
        for (let j = 1; j < numEntities; j++) {
          let newEntityIdx = Math.floor(Math.random() * entities.length);
          
          // Ensure we don't pick the same entity twice
          while (entityIndices.includes(newEntityIdx)) {
            newEntityIdx = Math.floor(Math.random() * entities.length);
          }
          
          entityIndices.push(newEntityIdx);
        }
        
        // Create transactions in a layering pattern
        const baseAmount = 50000 + Math.random() * 200000;
        const baseTime = new Date().getTime() - 30 * 24 * 60 * 60 * 1000; // 30 days ago
        
        for (let j = 0; j < numEntities - 1; j++) {
          const sourceIdx = j;
          const destIdx = j + 1;
          
          const sourceEntityId = entities[entityIndices[sourceIdx]].id;
          const destEntityId = entities[entityIndices[destIdx]].id;
          
          // Each transaction decreases slightly in amount (fees)
          const amount = baseAmount * (1 - j * 0.02); // 2% decrease each step
          
          // Timestamp progressing by a day or two each step
          const timestamp = new Date(baseTime + j * (24 + Math.random() * 24) * 60 * 60 * 1000).toISOString();
          
          syntheticTxs.push({
            id: `LY-${i}-${j}`,
            sourceEntityId,
            destinationEntityId: destEntityId,
            amount,
            currency: 'USD',
            timestamp,
            description: 'Transfer',
            type: 'transfer',
            category: 'fiat',
            riskScore: 65,
            riskLevel: 'high'
          });
        }
        
        // Convert to sequence
        const sequence = this.transactionsToSequence(syntheticTxs, entities);
        sequences.push(sequence);
        labels.push([1]); // Positive example
      }
    }
  }
  
  /**
   * Generate smurfing transaction examples
   */
  private generateSmurfingExamples(
    transactions: Transaction[],
    entities: Entity[],
    sequences: number[][][],
    labels: number[][]
  ): void {
    // For smurfing, we look for multiple small deposits from different sources to the same destination
    
    // Group transactions by destination entity
    const txByDestination = new Map<string, Transaction[]>();
    
    transactions.forEach(tx => {
      const destTxs = txByDestination.get(tx.destinationEntityId) || [];
      destTxs.push(tx);
      txByDestination.set(tx.destinationEntityId, destTxs);
    });
    
    // Find entities with multiple small incoming transactions from different sources
    txByDestination.forEach((entityTxs, entityId) => {
      // Sort by timestamp
      entityTxs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      // Look for clusters of small transactions in a short time period
      const timeWindowMs = 14 * 24 * 60 * 60 * 1000; // 14 days
      const smallTxThreshold = 3000; // Example threshold for "small" transactions
      
      for (let i = 0; i < entityTxs.length; i++) {
        const windowTxs: Transaction[] = [];
        const startTime = new Date(entityTxs[i].timestamp).getTime();
        
        // Find transactions within time window
        for (let j = i; j < entityTxs.length; j++) {
          const txTime = new Date(entityTxs[j].timestamp).getTime();
          if (txTime - startTime <= timeWindowMs) {
            windowTxs.push(entityTxs[j]);
          } else {
            break;
          }
        }
        
        // Check if we have enough transactions in the window
        if (windowTxs.length >= 5) {
          // Check for smurfing pattern:
          // 1. Most transactions are below the small tx threshold
          // 2. Transactions come from multiple different sources
          
          const smallTxCount = windowTxs.filter(tx => tx.amount <= smallTxThreshold).length;
          const uniqueSources = new Set(windowTxs.map(tx => tx.sourceEntityId)).size;
          
          if (smallTxCount >= 4 && uniqueSources >= 3) {
            // We found a potential smurfing pattern
            const sequence = this.transactionsToSequence(windowTxs, entities);
            sequences.push(sequence);
            labels.push([1]); // Positive example
            
            // Skip ahead to avoid overlapping sequences
            i += windowTxs.length - 1;
          }
        }
      }
    });
    
    // If we didn't find enough examples, create synthetic ones
    const minExamples = 10;
    if (sequences.length < minExamples) {
      const numSyntheticNeeded = minExamples - sequences.length;
      
      for (let i = 0; i < numSyntheticNeeded; i++) {
        // Create a synthetic smurfing pattern
        const syntheticTxs: Transaction[] = [];
        
        // Target destination entity
        const destEntityIdx = Math.floor(Math.random() * entities.length);
        const destEntityId = entities[destEntityIdx].id;
        
        // Create 5-8 small transactions from different sources
        const numTxs = 5 + Math.floor(Math.random() * 4);
        const baseTime = new Date().getTime() - 30 * 24 * 60 * 60 * 1000; // 30 days ago
        
        // Select source entities (different from destination and each other)
        const sourceIndices: number[] = [];
        for (let j = 0; j < numTxs; j++) {
          let sourceIdx = Math.floor(Math.random() * entities.length);
          
          // Ensure source is different from destination and other sources
          while (sourceIdx === destEntityIdx || sourceIndices.includes(sourceIdx)) {
            sourceIdx = Math.floor(Math.random() * entities.length);
          }
          
          sourceIndices.push(sourceIdx);
          
          // Create transaction
          const amount = 500 + Math.random() * 2500; // Small amount between $500-$3000
          const timestamp = new Date(baseTime + j * (Math.random() * 3) * 24 * 60 * 60 * 1000).toISOString();
          
          syntheticTxs.push({
            id: `SM-${i}-${j}`,
            sourceEntityId: entities[sourceIdx].id,
            destinationEntityId: destEntityId,
            amount,
            currency: 'USD',
            timestamp,
            description: 'Deposit',
            type: 'deposit',
            category: 'fiat',
            riskScore: 60,
            riskLevel: 'medium'
          });
        }
        
        // Convert to sequence
        const sequence = this.transactionsToSequence(syntheticTxs, entities);
        sequences.push(sequence);
        labels.push([1]); // Positive example
      }
    }
  }
  
  /**
   * Generate trade-based money laundering examples
   */
  private generateTradeBasedExamples(
    transactions: Transaction[],
    entities: Entity[],
    sequences: number[][][],
    labels: number[][]
  ): void {
    // Trade-based ML involves over/under-invoicing or phantom shipping
    // Look for regular transactions with significant price differences for similar goods/services
    
    // This pattern is hard to detect without invoice data, so we'll create synthetic examples
    const minExamples = 10;
    
    for (let i = 0; i < minExamples; i++) {
      // Create a synthetic trade-based ML pattern
      const syntheticTxs: Transaction[] = [];
      
      // Select 2 entities (importer/exporter)
      let exporterIdx = Math.floor(Math.random() * entities.length);
      let importerIdx = Math.floor(Math.random() * entities.length);
      
      // Ensure different entities
      while (importerIdx === exporterIdx) {
        importerIdx = Math.floor(Math.random() * entities.length);
      }
      
      const exporterId = entities[exporterIdx].id;
      const importerId = entities[importerIdx].id;
      
      // Create a series of trade transactions with oscillating values
      const numTxs = 4 + Math.floor(Math.random() * 4); // 4-7 transactions
      const baseTime = new Date().getTime() - 180 * 24 * 60 * 60 * 1000; // 180 days ago
      const baseAmount = 50000 + Math.random() * 200000;
      
      for (let j = 0; j < numTxs; j++) {
        // Alternate direction (import/export)
        const sourceId = j % 2 === 0 ? exporterId : importerId;
        const destId = j % 2 === 0 ? importerId : exporterId;
        
        // Price has large variations (over/under invoicing)
        let amount: number;
        
        if (j % 2 === 0) {
          // Over-invoiced (high price)
          amount = baseAmount * (1.5 + Math.random() * 0.5);
        } else {
          // Under-invoiced (low price)
          amount = baseAmount * (0.5 + Math.random() * 0.3);
        }
        
        // Timestamp every 1-2 months
        const timestamp = new Date(baseTime + j * (30 + Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString();
        
        syntheticTxs.push({
          id: `TB-${i}-${j}`,
          sourceEntityId: sourceId,
          destinationEntityId: destId,
          amount,
          currency: 'USD',
          timestamp,
          description: 'Trade payment for goods',
          type: 'payment',
          category: j % 2 === 0 ? 'cross_border' : 'fiat',
          riskScore: 75,
          riskLevel: 'high'
        });
      }
      
      // Convert to sequence
      const sequence = this.transactionsToSequence(syntheticTxs, entities);
      sequences.push(sequence);
      labels.push([1]); // Positive example
    }
  }
  
  /**
   * Generate negative examples (transactions without suspicious patterns)
   */
  private generateNegativeExamples(
    patternName: string,
    transactions: Transaction[],
    entities: Entity[],
    numExamples: number
  ): {
    sequences: number[][][];
    labels: number[][];
  } {
    const sequences: number[][][] = [];
    const labels: number[][] = [];
    
    // Sort transactions by timestamp
    const sortedTransactions = [...transactions].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Create random sequences from normal transactions
    const maxStartIdx = Math.max(0, sortedTransactions.length - this.SEQUENCE_LENGTH);
    const step = Math.max(1, Math.floor(maxStartIdx / numExamples));
    
    for (let i = 0; i < maxStartIdx && sequences.length < numExamples; i += step) {
      const sequenceTxs = sortedTransactions.slice(i, i + this.SEQUENCE_LENGTH);
      
      // Skip if we don't have enough transactions
      if (sequenceTxs.length < 3) continue;
      
      // Convert to sequence
      const sequence = this.transactionsToSequence(sequenceTxs, entities);
      sequences.push(sequence);
      labels.push([0]); // Negative example
    }
    
    // If we still need more examples, create synthetic ones
    while (sequences.length < numExamples) {
      // Create a synthetic normal transaction pattern
      const syntheticTxs: Transaction[] = [];
      
      // Random number of transactions in sequence
      const numTxs = 3 + Math.floor(Math.random() * 5); // 3-7 transactions
      
      // Create transactions between random entities
      for (let j = 0; j < numTxs; j++) {
        // Random source and destination
        let sourceIdx = Math.floor(Math.random() * entities.length);
        let destIdx = Math.floor(Math.random() * entities.length);
        
        // Ensure different entities
        while (destIdx === sourceIdx) {
          destIdx = Math.floor(Math.random() * entities.length);
        }
        
        // Random amount
        const amount = 1000 + Math.random() * 50000;
        
        // Timestamp with random intervals
        const baseTime = new Date().getTime() - 365 * 24 * 60 * 60 * 1000; // 1 year ago
        const timestamp = new Date(baseTime + j * (Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString();
        
        syntheticTxs.push({
          id: `NEG-${sequences.length}-${j}`,
          sourceEntityId: entities[sourceIdx].id,
          destinationEntityId: entities[destIdx].id,
          amount,
          currency: 'USD',
          timestamp,
          description: 'Normal payment',
          type: 'payment',
          category: 'fiat',
          riskScore: 25,
          riskLevel: 'low'
        });
      }
      
      // Convert to sequence
      const sequence = this.transactionsToSequence(syntheticTxs, entities);
      sequences.push(sequence);
      labels.push([0]); // Negative example
    }
    
    return { sequences, labels };
  }
  
  /**
   * Convert transactions to a normalized sequence for the model
   */
  private transactionsToSequence(
    transactions: Transaction[],
    entities: Entity[]
  ): number[][] {
    // Sort transactions by timestamp
    const sortedTxs = [...transactions].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Create entity maps for efficient lookup
    const entityMap = new Map<string, Entity>();
    entities.forEach(entity => {
      entityMap.set(entity.id, entity);
    });
    
    // Extract features from each transaction
    const features = sortedTxs.map(tx => {
      // Get entities
      const sourceEntity = entityMap.get(tx.sourceEntityId);
      const destEntity = entityMap.get(tx.destinationEntityId);
      
      // Normalize amount (log scale)
      const amount = Math.log(tx.amount + 1) / 15;
      
      // Time features
      const txTime = new Date(tx.timestamp);
      const hour = txTime.getHours() / 24;
      const dayOfWeek = txTime.getDay() / 6;
      
      // Entity risk (normalized)
      const sourceRisk = sourceEntity ? sourceEntity.riskScore / 100 : 0.5;
      const destRisk = destEntity ? destEntity.riskScore / 100 : 0.5;
      
      // Transaction category
      const isCrossBorder = tx.category === 'cross_border' ? 1 : 0;
      const isCrypto = tx.category === 'crypto' ? 1 : 0;
      
      return [
        amount,
        hour,
        dayOfWeek,
        sourceRisk,
        destRisk,
        isCrossBorder,
        isCrypto
      ];
    });
    
    // Pad or truncate to SEQUENCE_LENGTH
    const sequence: number[][] = new Array(this.SEQUENCE_LENGTH).fill(null).map(() => 
      new Array(this.FEATURE_COUNT).fill(0)
    );
    
    for (let i = 0; i < Math.min(features.length, this.SEQUENCE_LENGTH); i++) {
      sequence[i] = features[i];
    }
    
    return sequence;
  }
  
  /**
   * Train model for a specific pattern
   */
  async trainPatternModel(
    patternName: string,
    transactions: Transaction[],
    entities: Entity[]
  ): Promise<void> {
    if (!this.PATTERNS.includes(patternName)) {
      throw new Error(`Unsupported pattern: ${patternName}`);
    }
    
    console.log(`Training ${patternName} pattern detection model...`);
    
    // Generate training data
    const { sequences, labels } = this.generateSyntheticData(patternName, transactions, entities);
    
    if (sequences.length < 10) {
      throw new Error(`Insufficient data to train ${patternName} pattern model. Need at least 10 examples.`);
    }
    
    // Convert to tensors
    const sequenceTensor = tf.tensor3d(sequences);
    const labelTensor = tf.tensor2d(labels);
    
    // Build model if not already built
    if (!this.patterns.has(patternName)) {
      this.patterns.set(patternName, this.buildModel(patternName));
    }
    
    const model = this.patterns.get(patternName)!;
    
    // Train model
    await model.fit(sequenceTensor, labelTensor, {
      epochs: 30,
      batchSize: 16,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 5 === 0) {
            console.log(`${patternName} - Epoch ${epoch}: loss = ${logs?.loss.toFixed(5)}, accuracy = ${logs?.acc.toFixed(5)}`);
          }
        }
      }
    });
    
    console.log(`${patternName} model trained successfully`);
    
    // Determine threshold for detection (using validation data)
    const predictions = model.predict(sequenceTensor) as tf.Tensor;
    const predValues = await predictions.array() as number[][];
    
    // Calculate precision/recall at different thresholds
    const thresholds = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
    let bestThreshold = 0.5;
    let bestF1 = 0;
    
    for (const threshold of thresholds) {
      let tp = 0, fp = 0, fn = 0;
      
      for (let i = 0; i < predValues.length; i++) {
        const pred = predValues[i][0] >= threshold ? 1 : 0;
        const actual = labels[i][0];
        
        if (pred === 1 && actual === 1) tp++;
        if (pred === 1 && actual === 0) fp++;
        if (pred === 0 && actual === 1) fn++;
      }
      
      const precision = tp / (tp + fp) || 0;
      const recall = tp / (tp + fn) || 0;
      const f1 = 2 * (precision * recall) / (precision + recall) || 0;
      
      if (f1 > bestF1) {
        bestF1 = f1;
        bestThreshold = threshold;
      }
    }
    
    // Store optimal threshold
    this.patternThresholds.set(patternName, bestThreshold);
    console.log(`${patternName} model threshold set to ${bestThreshold.toFixed(2)}`);
    
    // Cleanup tensors
    sequenceTensor.dispose();
    labelTensor.dispose();
    predictions.dispose();
  }
  
  /**
   * Train models for all patterns
   */
  async trainAllPatterns(transactions: Transaction[], entities: Entity[]): Promise<void> {
    for (const pattern of this.PATTERNS) {
      await this.trainPatternModel(pattern, transactions, entities);
    }
    
    console.log('All pattern detection models trained successfully');
  }
  
  /**
   * Detect patterns in transaction sequences
   */
  async detectPatterns(
    transactions: Transaction[],
    entities: Entity[]
  ): Promise<{
    patterns: {
      name: string;
      description: string;
      transactions: string[];
      confidence: number;
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
    }[];
  }> {
    // Check if models are trained
    if (this.patterns.size === 0) {
      throw new Error('No trained models available. Call trainAllPatterns() first.');
    }
    
    // Group transactions into time windows
    const timeWindows = this.createTimeWindows(transactions);
    
    // Analyze each time window
    const allPatterns: {
      name: string;
      description: string;
      transactions: string[];
      confidence: number;
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
    }[] = [];
    
    for (const windowTxs of timeWindows) {
      const patterns = await this.detectPatternsInWindow(windowTxs, entities);
      allPatterns.push(...patterns);
    }
    
    return { patterns: allPatterns };
  }
  
  /**
   * Create sliding time windows of transactions
   */
  private createTimeWindows(transactions: Transaction[]): Transaction[][] {
    // Sort transactions by timestamp
    const sortedTxs = [...transactions].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    const windows: Transaction[][] = [];
    
    // Group by destination entity
    const txByDest = new Map<string, Transaction[]>();
    for (const tx of sortedTxs) {
      const destTxs = txByDest.get(tx.destinationEntityId) || [];
      destTxs.push(tx);
      txByDest.set(tx.destinationEntityId, destTxs);
    }
    
    // Create windows for each destination entity
    txByDest.forEach(entityTxs => {
      if (entityTxs.length < 3) return; // Skip if too few transactions
      
      // Create overlapping windows
      for (let i = 0; i < entityTxs.length; i += 3) {
        const windowTxs = entityTxs.slice(i, i + this.SEQUENCE_LENGTH);
        if (windowTxs.length >= 3) {
          windows.push(windowTxs);
        }
      }
    });
    
    // Also create windows based on time
    const timeWindowMs = 14 * 24 * 60 * 60 * 1000; // 14 days
    
    for (let i = 0; i < sortedTxs.length; i++) {
      const startTime = new Date(sortedTxs[i].timestamp).getTime();
      const windowTxs: Transaction[] = [];
      
      for (let j = i; j < sortedTxs.length; j++) {
        const txTime = new Date(sortedTxs[j].timestamp).getTime();
        if (txTime - startTime <= timeWindowMs) {
          windowTxs.push(sortedTxs[j]);
        } else {
          break;
        }
      }
      
      if (windowTxs.length >= 3) {
        windows.push(windowTxs);
        // Skip ahead to reduce overlap
        i += Math.floor(windowTxs.length / 2);
      }
    }
    
    return windows;
  }
  
  /**
   * Detect patterns in a specific time window
   */
  private async detectPatternsInWindow(
    transactions: Transaction[],
    entities: Entity[]
  ): Promise<{
    name: string;
    description: string;
    transactions: string[];
    confidence: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }[]> {
    const patterns: {
      name: string;
      description: string;
      transactions: string[];
      confidence: number;
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
    }[] = [];
    
    // Convert transactions to sequence
    const sequence = this.transactionsToSequence(transactions, entities);
    const sequenceTensor = tf.tensor3d([sequence]);
    
    // Check each pattern model
    for (const [patternName, model] of this.patterns.entries()) {
      // Get prediction
      const prediction = model.predict(sequenceTensor) as tf.Tensor;
      const [confidence] = await prediction.data();
      
      // Get threshold
      const threshold = this.patternThresholds.get(patternName) || 0.5;
      
      // If above threshold, add to detected patterns
      if (confidence >= threshold) {
        // Create pattern description
        const pattern = {
          name: this.formatPatternName(patternName),
          description: this.getPatternDescription(patternName, transactions),
          transactions: transactions.map(tx => tx.id),
          confidence,
          riskLevel: this.getRiskLevel(patternName, confidence)
        };
        
        patterns.push(pattern);
      }
      
      // Cleanup tensor
      prediction.dispose();
    }
    
    // Cleanup tensor
    sequenceTensor.dispose();
    
    return patterns;
  }
  
  /**
   * Format pattern name for display
   */
  private formatPatternName(patternName: string): string {
    switch (patternName) {
      case 'structuring':
        return 'Structuring';
      case 'round_trip':
        return 'Round-Trip Transactions';
      case 'layering':
        return 'Layering';
      case 'smurfing':
        return 'Smurfing';
      case 'trade_based':
        return 'Trade-Based ML';
      default:
        return patternName.charAt(0).toUpperCase() + patternName.slice(1).replace('_', ' ');
    }
  }
  
  /**
   * Generate pattern description
   */
  private getPatternDescription(patternName: string, transactions: Transaction[]): string {
    const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const uniqueEntities = new Set([
      ...transactions.map(tx => tx.sourceEntityId),
      ...transactions.map(tx => tx.destinationEntityId)
    ]);
    
    switch (patternName) {
      case 'structuring':
        return `Multiple transactions below reporting threshold (total: $${totalAmount.toFixed(2)}) detected, possibly to avoid reporting requirements`;
        
      case 'round_trip':
        return `Funds circulating through ${uniqueEntities.size} entities and returning to the original source, potentially to obscure the money trail`;
        
      case 'layering':
        return `Complex chain of ${transactions.length} transactions through ${uniqueEntities.size} entities to hide the origin of funds`;
        
      case 'smurfing':
        return `Multiple small deposits from different sources to the same recipient, potentially to avoid detection`;
        
      case 'trade_based':
        return `Significant price variations in trade transactions, potentially indicating over/under-invoicing to move value across borders`;
        
      default:
        return `Suspicious pattern involving ${transactions.length} transactions and ${uniqueEntities.size} entities`;
    }
  }
  
  /**
   * Determine risk level based on pattern and confidence
   */
  private getRiskLevel(patternName: string, confidence: number): 'low' | 'medium' | 'high' | 'critical' {
    // Base risk levels for different patterns
    const baseRiskLevels: { [key: string]: number } = {
      'structuring': 3,
      'round_trip': 3,
      'layering': 4,
      'smurfing': 2,
      'trade_based': 3
    };
    
    const baseRisk = baseRiskLevels[patternName] || 2;
    
    // Adjust based on confidence
    let riskScore = baseRisk;
    if (confidence > 0.9) {
      riskScore += 1;
    } else if (confidence < 0.7) {
      riskScore -= 1;
    }
    
    // Map to risk level
    switch (riskScore) {
      case 1:
        return 'low';
      case 2:
        return 'medium';
      case 3:
        return 'high';
      case 4:
      case 5:
        return 'critical';
      default:
        return 'medium';
    }
  }
  
  /**
   * Save all models to files
   */
  async saveModels(basePath: string): Promise<void> {
    // Create promises for all model saves
    const savePromises: Promise<void>[] = [];
    
    for (const [patternName, model] of this.patterns.entries()) {
      const path = `${basePath}/${patternName}`;
      savePromises.push(model.save(`file://${path}`));
    }
    
    // Save thresholds
    const thresholds: { [key: string]: number } = {};
    this.patternThresholds.forEach((value, key) => {
      thresholds[key] = value;
    });
    
    // Wait for all saves to complete
    await Promise.all(savePromises);
    console.log('All pattern models saved successfully');
  }
  
  /**
   * Load all models from files
   */
  async loadModels(basePath: string, thresholds: { [key: string]: number }): Promise<void> {
    // Create promises for all model loads
    const loadPromises: Promise<void>[] = [];
    
    for (const patternName of this.PATTERNS) {
      const path = `${basePath}/${patternName}`;
      
      try {
        const model = await tf.loadLayersModel(`file://${path}/model.json`);
        this.patterns.set(patternName, model);
        
        // Set threshold
        if (thresholds[patternName]) {
          this.patternThresholds.set(patternName, thresholds[patternName]);
        } else {
          this.patternThresholds.set(patternName, 0.5);
        }
        
        console.log(`${patternName} model loaded successfully`);
      } catch (error) {
        console.error(`Failed to load ${patternName} model:`, error);
      }
    }
    
    console.log('Pattern models loaded successfully');
  }
}

// Singleton instance for the application
export const transactionPatternModel = new TransactionPatternModel();