import * as tf from '@tensorflow/tfjs-node';
import { Entity, EntityRelationship, Transaction } from '@shared/schema';

/**
 * Graph Neural Network for Entity Network Analysis
 * 
 * This model analyzes relationships between entities to identify suspicious networks.
 * It uses a simplified graph neural network approach to learn entity embeddings
 * and detect suspicious clusters and patterns.
 */
export class EntityNetworkModel {
  private model: tf.LayersModel | null = null;
  private entityEmbeddings: Map<string, number[]> = new Map();
  private suspiciousPatterns: {
    name: string;
    entities: string[];
    riskScore: number;
    description: string;
  }[] = [];
  
  // Embedding dimension for entities
  private readonly embeddingDim = 16;
  
  constructor() {}
  
  /**
   * Build the graph neural network model
   */
  private buildModel(numEntities: number): tf.LayersModel {
    // Entity embedding layer
    const entityInput = tf.layers.input({ shape: [1], name: 'entity_input', dtype: 'int32' });
    const embedding = tf.layers.embedding({
      inputDim: numEntities,
      outputDim: this.embeddingDim,
      name: 'entity_embedding'
    }).apply(entityInput);
    const entityEmbedding = tf.layers.flatten().apply(embedding);
    
    // Relationship type embedding layer
    const relTypeInput = tf.layers.input({ shape: [1], name: 'relationship_type_input', dtype: 'int32' });
    const relTypeEmbedding = tf.layers.embedding({
      inputDim: 6, // Number of relationship types
      outputDim: 8,
      name: 'relationship_embedding'
    }).apply(relTypeInput);
    const relEmbedding = tf.layers.flatten().apply(relTypeEmbedding);
    
    // Neighbor entity input
    const neighborInput = tf.layers.input({ shape: [1], name: 'neighbor_input', dtype: 'int32' });
    const neighborEmbedding = tf.layers.embedding({
      inputDim: numEntities,
      outputDim: this.embeddingDim,
      name: 'neighbor_embedding',
      // Share weights with entity embedding
      weights: (embedding as any).weights
    }).apply(neighborInput);
    const neighborFlat = tf.layers.flatten().apply(neighborEmbedding);
    
    // Combine embeddings
    const combined = tf.layers.concatenate().apply([
      entityEmbedding, relEmbedding, neighborFlat
    ]);
    
    // Prediction layers
    const dense1 = tf.layers.dense({
      units: 16,
      activation: 'relu'
    }).apply(combined);
    
    const output = tf.layers.dense({
      units: 1,
      activation: 'sigmoid',
      name: 'risk_score'
    }).apply(dense1);
    
    // Create model
    const model = tf.model({
      inputs: [entityInput, relTypeInput, neighborInput],
      outputs: output as tf.SymbolicTensor
    });
    
    // Compile model
    model.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
    
    return model;
  }
  
  /**
   * Map entity and relationship types to numeric indices
   */
  private createEntityMapping(entities: Entity[]): {
    entityToIdx: Map<string, number>;
    idxToEntity: Map<number, string>;
    relTypeToIdx: Map<string, number>;
  } {
    const entityToIdx = new Map<string, number>();
    const idxToEntity = new Map<number, string>();
    const relTypeToIdx = new Map<string, number>([
      ['owner', 0],
      ['beneficiary', 1],
      ['affiliate', 2],
      ['intermediary', 3],
      ['customer', 4],
      ['supplier', 5]
    ]);
    
    entities.forEach((entity, idx) => {
      entityToIdx.set(entity.id, idx);
      idxToEntity.set(idx, entity.id);
    });
    
    return { entityToIdx, idxToEntity, relTypeToIdx };
  }
  
  /**
   * Prepare training data from entity relationships
   */
  private prepareTrainingData(
    entities: Entity[],
    relationships: EntityRelationship[],
    entityToIdx: Map<string, number>,
    relTypeToIdx: Map<string, number>
  ): {
    entityIndices: number[];
    relTypeIndices: number[];
    neighborIndices: number[];
    labels: number[];
  } {
    const entityIndices: number[] = [];
    const relTypeIndices: number[] = [];
    const neighborIndices: number[] = [];
    const labels: number[] = [];
    
    // Create positive examples from relationships
    relationships.forEach(rel => {
      const sourceIdx = entityToIdx.get(rel.sourceEntityId);
      const targetIdx = entityToIdx.get(rel.targetEntityId);
      const relTypeIdx = relTypeToIdx.get(rel.relationshipType);
      
      if (sourceIdx !== undefined && targetIdx !== undefined && relTypeIdx !== undefined) {
        // Create positive example
        entityIndices.push(sourceIdx);
        relTypeIndices.push(relTypeIdx);
        neighborIndices.push(targetIdx);
        
        // Label based on risk levels
        const sourceEntity = entities.find(e => e.id === rel.sourceEntityId);
        const targetEntity = entities.find(e => e.id === rel.targetEntityId);
        
        if (sourceEntity && targetEntity) {
          // Calculate label based on risk levels and relationship strength
          const sourceRisk = sourceEntity.riskScore / 100;
          const targetRisk = targetEntity.riskScore / 100;
          const strength = rel.strength / 100;
          
          // Higher risk for high risk entities with strong connections
          const riskLabel = (sourceRisk * targetRisk * strength) > 0.3 ? 1 : 0;
          labels.push(riskLabel);
        } else {
          labels.push(0);
        }
        
        // Create the reverse relationship as well (symmetric graph)
        entityIndices.push(targetIdx);
        relTypeIndices.push(relTypeIdx);
        neighborIndices.push(sourceIdx);
        labels.push(labels[labels.length - 1]); // Same label as the forward relationship
      }
    });
    
    // Generate negative examples (randomly paired entities that aren't connected)
    const numEntities = entities.length;
    const numNegExamples = Math.min(relationships.length, numEntities * 2);
    
    for (let i = 0; i < numNegExamples; i++) {
      const randSourceIdx = Math.floor(Math.random() * numEntities);
      let randTargetIdx = Math.floor(Math.random() * numEntities);
      
      // Make sure we don't select the same entity
      while (randTargetIdx === randSourceIdx) {
        randTargetIdx = Math.floor(Math.random() * numEntities);
      }
      
      // Check if these entities are already connected
      const sourceId = entities[randSourceIdx].id;
      const targetId = entities[randTargetIdx].id;
      
      const connected = relationships.some(
        rel => (rel.sourceEntityId === sourceId && rel.targetEntityId === targetId) ||
               (rel.sourceEntityId === targetId && rel.targetEntityId === sourceId)
      );
      
      if (!connected) {
        // Add negative example
        entityIndices.push(randSourceIdx);
        relTypeIndices.push(Math.floor(Math.random() * 6)); // Random relationship type
        neighborIndices.push(randTargetIdx);
        labels.push(0); // Negative example
      }
    }
    
    return { entityIndices, relTypeIndices, neighborIndices, labels };
  }
  
  /**
   * Train the entity network model
   */
  async train(
    entities: Entity[],
    relationships: EntityRelationship[],
    transactions: Transaction[]
  ): Promise<void> {
    if (entities.length < 5 || relationships.length < 5) {
      throw new Error('Insufficient data for training. Need at least 5 entities and relationships.');
    }
    
    const { entityToIdx, idxToEntity, relTypeToIdx } = this.createEntityMapping(entities);
    const numEntities = entities.length;
    
    // Build model if not already built
    if (!this.model) {
      this.model = this.buildModel(numEntities);
    }
    
    // Prepare training data
    const {
      entityIndices,
      relTypeIndices,
      neighborIndices,
      labels
    } = this.prepareTrainingData(entities, relationships, entityToIdx, relTypeToIdx);
    
    // Convert to tensors
    const entityTensor = tf.tensor2d(entityIndices, [entityIndices.length, 1], 'int32');
    const relTypeTensor = tf.tensor2d(relTypeIndices, [relTypeIndices.length, 1], 'int32');
    const neighborTensor = tf.tensor2d(neighborIndices, [neighborIndices.length, 1], 'int32');
    const labelTensor = tf.tensor2d(labels, [labels.length, 1], 'float32');
    
    // Train the model
    console.log('Training entity network model...');
    await this.model.fit(
      [entityTensor, relTypeTensor, neighborTensor],
      labelTensor,
      {
        epochs: 30,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 5 === 0) {
              console.log(`Epoch ${epoch}: loss = ${logs?.loss.toFixed(5)}, accuracy = ${logs?.acc.toFixed(5)}`);
            }
          }
        }
      }
    );
    
    console.log('Entity network model trained successfully');
    
    // Extract entity embeddings
    const embeddingLayer = this.model.getLayer('entity_embedding');
    const embeddingWeights = embeddingLayer.getWeights()[0];
    const embeddingValues = await embeddingWeights.array();
    
    // Store embeddings for later use
    entities.forEach(entity => {
      const idx = entityToIdx.get(entity.id);
      if (idx !== undefined) {
        this.entityEmbeddings.set(entity.id, embeddingValues[idx]);
      }
    });
    
    // Find suspicious patterns in the network
    this.findSuspiciousPatterns(entities, relationships, transactions);
    
    // Cleanup tensors
    entityTensor.dispose();
    relTypeTensor.dispose();
    neighborTensor.dispose();
    labelTensor.dispose();
    embeddingWeights.dispose();
  }
  
  /**
   * Calculate similarity between entity embeddings
   */
  private calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    // Cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }
    
    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);
    
    return dotProduct / (norm1 * norm2);
  }
  
  /**
   * Find suspicious patterns in the entity network
   */
  private findSuspiciousPatterns(
    entities: Entity[],
    relationships: EntityRelationship[],
    transactions: Transaction[]
  ): void {
    this.suspiciousPatterns = [];
    
    // Find circular ownership structures
    this.detectCircularOwnership(entities, relationships);
    
    // Find shell company patterns
    this.detectShellCompanies(entities, relationships, transactions);
    
    // Find layering patterns
    this.detectLayeringPatterns(entities, relationships, transactions);
    
    // Find high-risk clusters
    this.detectHighRiskClusters(entities, relationships);
  }
  
  /**
   * Detect circular ownership structures in the entity network
   */
  private detectCircularOwnership(entities: Entity[], relationships: EntityRelationship[]): void {
    // Build ownership graph
    const ownershipGraph = new Map<string, string[]>();
    
    entities.forEach(entity => {
      ownershipGraph.set(entity.id, []);
    });
    
    relationships.forEach(rel => {
      if (rel.relationshipType === 'owner') {
        const owners = ownershipGraph.get(rel.targetEntityId) || [];
        owners.push(rel.sourceEntityId);
        ownershipGraph.set(rel.targetEntityId, owners);
      }
    });
    
    // Find cycles in the graph using DFS
    const findCycles = (entityId: string, path: string[] = [], visited: Set<string> = new Set()): string[][] => {
      if (visited.has(entityId)) {
        const cycleStartIndex = path.indexOf(entityId);
        if (cycleStartIndex >= 0) {
          return [path.slice(cycleStartIndex).concat(entityId)];
        }
        return [];
      }
      
      visited.add(entityId);
      path.push(entityId);
      
      const cycles: string[][] = [];
      const owners = ownershipGraph.get(entityId) || [];
      
      for (const owner of owners) {
        const newCycles = findCycles(owner, [...path], new Set(visited));
        cycles.push(...newCycles);
      }
      
      return cycles;
    };
    
    // Check each entity for cycles
    const allCycles = new Set<string>();
    entities.forEach(entity => {
      const cycles = findCycles(entity.id);
      cycles.forEach(cycle => {
        // Convert cycle to canonical form to avoid duplicates
        const sortedCycle = [...cycle].sort().join('-');
        if (!allCycles.has(sortedCycle) && cycle.length > 2) {
          allCycles.add(sortedCycle);
          
          // Add to suspicious patterns
          this.suspiciousPatterns.push({
            name: 'Circular Ownership',
            entities: cycle,
            riskScore: 0.8,
            description: `Detected circular ownership pattern involving ${cycle.length} entities`
          });
        }
      });
    });
  }
  
  /**
   * Detect potential shell companies
   */
  private detectShellCompanies(
    entities: Entity[],
    relationships: EntityRelationship[],
    transactions: Transaction[]
  ): void {
    // Look for entities with:
    // 1. Few outgoing transactions relative to incoming transactions
    // 2. High value transactions
    // 3. Connections to high-risk jurisdictions
    // 4. Complex ownership structure
    
    const transactionCounts = new Map<string, { incoming: number, outgoing: number, total: number, value: number }>();
    
    // Count transactions per entity
    entities.forEach(entity => {
      transactionCounts.set(entity.id, { incoming: 0, outgoing: 0, total: 0, value: 0 });
    });
    
    transactions.forEach(tx => {
      // Incoming transactions
      const destStats = transactionCounts.get(tx.destinationEntityId);
      if (destStats) {
        destStats.incoming += 1;
        destStats.total += 1;
        destStats.value += tx.amount;
        transactionCounts.set(tx.destinationEntityId, destStats);
      }
      
      // Outgoing transactions
      const sourceStats = transactionCounts.get(tx.sourceEntityId);
      if (sourceStats) {
        sourceStats.outgoing += 1;
        sourceStats.total += 1;
        sourceStats.value += tx.amount;
        transactionCounts.set(tx.sourceEntityId, sourceStats);
      }
    });
    
    // Count relationships per entity
    const relationshipCounts = new Map<string, number>();
    entities.forEach(entity => {
      relationshipCounts.set(entity.id, 0);
    });
    
    relationships.forEach(rel => {
      const sourceCount = relationshipCounts.get(rel.sourceEntityId) || 0;
      relationshipCounts.set(rel.sourceEntityId, sourceCount + 1);
      
      const targetCount = relationshipCounts.get(rel.targetEntityId) || 0;
      relationshipCounts.set(rel.targetEntityId, targetCount + 1);
    });
    
    // High-risk jurisdictions (this would be a more comprehensive list in production)
    const highRiskJurisdictions = new Set([
      'cayman islands', 'british virgin islands', 'panama', 'bahamas',
      'seychelles', 'belize', 'cyprus', 'liechtenstein', 'jersey', 'guernsey'
    ]);
    
    // Identify potential shell companies
    entities.forEach(entity => {
      const txStats = transactionCounts.get(entity.id);
      const relCount = relationshipCounts.get(entity.id) || 0;
      
      if (!txStats) return;
      
      // Calculate shell company score
      let shellScore = 0;
      
      // Significant imbalance between incoming and outgoing transactions
      if (txStats.total > 0 && txStats.incoming > 0 && txStats.outgoing / txStats.incoming < 0.3) {
        shellScore += 0.3;
      }
      
      // High value transactions relative to the entity's age
      const entityAgeInDays = (new Date().getTime() - new Date(entity.registrationDate).getTime()) / (1000 * 60 * 60 * 24);
      if (entityAgeInDays < 180 && txStats.value > 100000) {
        shellScore += 0.2;
      }
      
      // High-risk jurisdiction
      if (highRiskJurisdictions.has(entity.jurisdiction.toLowerCase())) {
        shellScore += 0.3;
      }
      
      // Complex relationship structure
      if (relCount > 5) {
        shellScore += 0.2;
      }
      
      // Identify as shell company if score is high enough
      if (shellScore > 0.5) {
        // Find connected entities
        const connectedEntities = relationships
          .filter(rel => rel.sourceEntityId === entity.id || rel.targetEntityId === entity.id)
          .map(rel => rel.sourceEntityId === entity.id ? rel.targetEntityId : rel.sourceEntityId);
        
        this.suspiciousPatterns.push({
          name: 'Potential Shell Company',
          entities: [entity.id, ...connectedEntities],
          riskScore: shellScore,
          description: `Entity in high-risk jurisdiction with unusual transaction patterns and complex structure`
        });
      }
    });
  }
  
  /**
   * Detect layering patterns (transactions through multiple intermediaries)
   */
  private detectLayeringPatterns(
    entities: Entity[],
    relationships: EntityRelationship[],
    transactions: Transaction[]
  ): void {
    // Build transaction graph
    const transactionGraph = new Map<string, Map<string, Transaction[]>>();
    
    entities.forEach(entity => {
      transactionGraph.set(entity.id, new Map());
    });
    
    transactions.forEach(tx => {
      const sourceMap = transactionGraph.get(tx.sourceEntityId);
      if (sourceMap) {
        const destTxs = sourceMap.get(tx.destinationEntityId) || [];
        destTxs.push(tx);
        sourceMap.set(tx.destinationEntityId, destTxs);
        transactionGraph.set(tx.sourceEntityId, sourceMap);
      }
    });
    
    // Find paths with 3+ entities in transaction chain (source -> intermediaries -> destination)
    const findPaths = (
      start: string,
      visited: Set<string> = new Set(),
      path: string[] = [],
      txPath: Transaction[] = []
    ): { entityPath: string[], txPath: Transaction[] }[] => {
      if (visited.has(start)) return [];
      
      visited.add(start);
      path.push(start);
      
      // If path is longer than threshold, record it
      if (path.length >= 4) {
        return [{ entityPath: [...path], txPath: [...txPath] }];
      }
      
      const destinations = transactionGraph.get(start);
      if (!destinations) return [];
      
      const allPaths: { entityPath: string[], txPath: Transaction[] }[] = [];
      
      destinations.forEach((txs, dest) => {
        txs.forEach(tx => {
          const newPaths = findPaths(
            dest,
            new Set(visited),
            [...path],
            [...txPath, tx]
          );
          allPaths.push(...newPaths);
        });
      });
      
      return allPaths;
    };
    
    // Check each entity as a potential starting point
    entities.forEach(entity => {
      const paths = findPaths(entity.id);
      
      paths.forEach(({ entityPath, txPath }) => {
        // Calculate total amount to see if consistent through the chain
        const amounts = txPath.map(tx => tx.amount);
        
        // Check if amounts are similar throughout the chain
        const avgAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
        const similarAmounts = amounts.every(amount => Math.abs(amount - avgAmount) / avgAmount < 0.1);
        
        // Check if transactions happened in quick succession
        const timestamps = txPath.map(tx => new Date(tx.timestamp).getTime());
        timestamps.sort((a, b) => a - b);
        
        const timeSpan = timestamps[timestamps.length - 1] - timestamps[0];
        const quickSuccession = timeSpan < 1000 * 60 * 60 * 24 * 7; // 7 days
        
        // High risk if amounts are similar and transactions happened quickly
        if (similarAmounts && quickSuccession) {
          this.suspiciousPatterns.push({
            name: 'Layering Pattern',
            entities: entityPath,
            riskScore: 0.75,
            description: `Funds flowing through ${entityPath.length} entities with similar amounts (avg: ${avgAmount.toFixed(2)}) in a short time period`
          });
        }
      });
    });
  }
  
  /**
   * Detect clusters of high-risk entities based on embeddings
   */
  private detectHighRiskClusters(entities: Entity[], relationships: EntityRelationship[]): void {
    if (this.entityEmbeddings.size === 0) return;
    
    // Use embeddings to cluster entities
    const highRiskEntities = entities.filter(e => e.riskScore > 70);
    
    // Skip if not enough high-risk entities
    if (highRiskEntities.length < 3) return;
    
    // For each high-risk entity, find similar entities
    highRiskEntities.forEach(entity => {
      if (!this.entityEmbeddings.has(entity.id)) return;
      
      const embedding = this.entityEmbeddings.get(entity.id)!;
      
      // Find similar entities based on embedding similarity
      const similarEntities = entities
        .filter(e => e.id !== entity.id && this.entityEmbeddings.has(e.id))
        .map(e => ({
          entity: e,
          similarity: this.calculateSimilarity(embedding, this.entityEmbeddings.get(e.id)!)
        }))
        .filter(({ similarity }) => similarity > 0.7)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5)
        .map(({ entity }) => entity.id);
      
      if (similarEntities.length >= 2) {
        this.suspiciousPatterns.push({
          name: 'High-Risk Cluster',
          entities: [entity.id, ...similarEntities],
          riskScore: 0.7,
          description: `Cluster of similar high-risk entities with strong connections`
        });
      }
    });
  }
  
  /**
   * Get entity embeddings for visualization
   */
  getEntityEmbeddings(): Map<string, number[]> {
    return this.entityEmbeddings;
  }
  
  /**
   * Get detected suspicious patterns
   */
  getSuspiciousPatterns(): {
    name: string;
    entities: string[];
    riskScore: number;
    description: string;
  }[] {
    return this.suspiciousPatterns;
  }
  
  /**
   * Save the model to files
   */
  async saveModel(path: string): Promise<void> {
    if (!this.model) {
      throw new Error('No model to save. Train the model first.');
    }
    
    await this.model.save(`file://${path}`);
    console.log(`Entity network model saved to ${path}`);
  }
  
  /**
   * Load a previously saved model
   */
  async loadModel(path: string): Promise<void> {
    this.model = await tf.loadLayersModel(`file://${path}/model.json`);
    console.log('Entity network model loaded successfully');
  }
}

// Singleton instance for the application
export const entityNetworkModel = new EntityNetworkModel();