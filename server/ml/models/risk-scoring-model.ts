import * as tf from '@tensorflow/tfjs-node';
import { Entity, Transaction } from '@shared/schema';

/**
 * Neural Network Model for Risk Scoring
 * 
 * This model uses a neural network to predict risk scores for entities and transactions.
 * It takes into account various risk factors and historical patterns.
 */
export class RiskScoringModel {
  private entityModel: tf.LayersModel | null = null;
  private transactionModel: tf.LayersModel | null = null;
  private entityFeatures: string[] = [
    'age',
    'numTransactions',
    'avgTransactionAmount',
    'maxTransactionAmount',
    'transactionFrequency',
    'jurisdictionRisk',
    'isHighRiskType',
    'networkCentrality',
    'numRelationships',
    'hasShellCompanyIndicators'
  ];
  private transactionFeatures: string[] = [
    'amount',
    'sourceEntityRisk',
    'destEntityRisk',
    'hourOfDay',
    'dayOfWeek',
    'isHighRiskCategory',
    'isCrossBorder',
    'velocity',
    'structuringIndicator',
    'roundTripIndicator'
  ];
  
  // High-risk jurisdictions
  private highRiskJurisdictions = new Set([
    'cayman islands', 'panama', 'bahamas', 'british virgin islands',
    'belize', 'seychelles', 'cyprus', 'mauritius', 'jersey', 'guernsey'
  ]);
  
  // US FINCEN $10,000 reporting threshold
  private readonly REPORTING_THRESHOLD = 10000;
  
  constructor() {}
  
  /**
   * Build the entity risk scoring model
   */
  private buildEntityModel(): tf.LayersModel {
    const model = tf.sequential();
    
    // Input layer
    model.add(tf.layers.dense({
      units: 64,
      activation: 'relu',
      inputShape: [this.entityFeatures.length]
    }));
    
    model.add(tf.layers.dropout({ rate: 0.2 }));
    
    // Hidden layers
    model.add(tf.layers.dense({
      units: 32,
      activation: 'relu'
    }));
    
    model.add(tf.layers.dropout({ rate: 0.2 }));
    
    model.add(tf.layers.dense({
      units: 16,
      activation: 'relu'
    }));
    
    // Output layer (risk score 0-100)
    model.add(tf.layers.dense({
      units: 1,
      activation: 'sigmoid'
    }));
    
    // Compile model
    model.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError',
      metrics: ['mse']
    });
    
    return model;
  }
  
  /**
   * Build the transaction risk scoring model
   */
  private buildTransactionModel(): tf.LayersModel {
    const model = tf.sequential();
    
    // Input layer
    model.add(tf.layers.dense({
      units: 64,
      activation: 'relu',
      inputShape: [this.transactionFeatures.length],
      kernelRegularizer: tf.regularizers.l1l2({ l1: 1e-5, l2: 1e-5 })
    }));
    
    model.add(tf.layers.dropout({ rate: 0.2 }));
    
    // Hidden layers
    model.add(tf.layers.dense({
      units: 32,
      activation: 'relu',
      kernelRegularizer: tf.regularizers.l1l2({ l1: 1e-5, l2: 1e-5 })
    }));
    
    model.add(tf.layers.dropout({ rate: 0.2 }));
    
    model.add(tf.layers.dense({
      units: 16,
      activation: 'relu'
    }));
    
    // Output layer (risk score 0-100)
    model.add(tf.layers.dense({
      units: 1,
      activation: 'sigmoid'
    }));
    
    // Compile model
    model.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError',
      metrics: ['mse']
    });
    
    return model;
  }
  
  /**
   * Prepare entity features for the model
   */
  private prepareEntityFeatures(
    entity: Entity,
    entityTransactions: Transaction[],
    networkCentrality: number,
    relationships: number
  ): number[] {
    // Calculate entity age in days
    const registrationDate = new Date(entity.registrationDate);
    const now = new Date();
    const ageInDays = (now.getTime() - registrationDate.getTime()) / (1000 * 60 * 60 * 24);
    const normalizedAge = Math.min(ageInDays / 3650, 1); // Normalize to 0-1 (max 10 years)
    
    // Transaction statistics
    const numTransactions = entityTransactions.length;
    const normalizedNumTx = Math.min(numTransactions / 100, 1); // Normalize to 0-1 (max 100 tx)
    
    // Average and max transaction amounts
    let avgAmount = 0;
    let maxAmount = 0;
    
    if (numTransactions > 0) {
      const amounts = entityTransactions.map(tx => tx.amount);
      avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / numTransactions;
      maxAmount = Math.max(...amounts);
    }
    
    // Normalize amounts
    const normalizedAvgAmount = Math.min(Math.log(avgAmount + 1) / 15, 1); // Normalize to 0-1
    const normalizedMaxAmount = Math.min(Math.log(maxAmount + 1) / 15, 1); // Normalize to 0-1
    
    // Transaction frequency (transactions per day)
    let txFrequency = 0;
    
    if (numTransactions > 1 && ageInDays > 0) {
      const timestamps = entityTransactions.map(tx => new Date(tx.timestamp).getTime());
      const minTimestamp = Math.min(...timestamps);
      const maxTimestamp = Math.max(...timestamps);
      const timeSpanDays = (maxTimestamp - minTimestamp) / (1000 * 60 * 60 * 24);
      
      if (timeSpanDays > 0) {
        txFrequency = numTransactions / timeSpanDays;
      }
    }
    
    const normalizedTxFrequency = Math.min(txFrequency / 10, 1); // Normalize to 0-1 (max 10 tx/day)
    
    // Jurisdiction risk
    const jurisdictionRisk = this.highRiskJurisdictions.has(entity.jurisdiction.toLowerCase()) ? 1 : 0;
    
    // Entity type risk
    const isHighRiskType = entity.type === 'corporate' ? 1 : 0;
    
    // Network centrality (normalized)
    const normalizedCentrality = Math.min(networkCentrality, 1);
    
    // Number of relationships (normalized)
    const normalizedRelationships = Math.min(relationships / 20, 1); // Normalize to 0-1 (max 20 relationships)
    
    // Shell company indicators
    // 1. New entity with high-value transactions
    // 2. High-risk jurisdiction
    // 3. Few outgoing transactions relative to incoming
    
    let shellCompanyScore = 0;
    
    if (ageInDays < 180 && maxAmount > 50000) {
      shellCompanyScore += 0.5;
    }
    
    if (jurisdictionRisk > 0) {
      shellCompanyScore += 0.3;
    }
    
    const incomingTx = entityTransactions.filter(tx => tx.destinationEntityId === entity.id).length;
    const outgoingTx = entityTransactions.filter(tx => tx.sourceEntityId === entity.id).length;
    
    if (incomingTx > 3 && outgoingTx < incomingTx * 0.3) {
      shellCompanyScore += 0.2;
    }
    
    const hasShellCompanyIndicators = Math.min(shellCompanyScore, 1);
    
    return [
      normalizedAge,
      normalizedNumTx,
      normalizedAvgAmount,
      normalizedMaxAmount,
      normalizedTxFrequency,
      jurisdictionRisk,
      isHighRiskType,
      normalizedCentrality,
      normalizedRelationships,
      hasShellCompanyIndicators
    ];
  }
  
  /**
   * Prepare transaction features for the model
   */
  private prepareTransactionFeatures(
    transaction: Transaction,
    entityRiskScores: Map<string, number>,
    recentTransactions: Transaction[]
  ): number[] {
    // Normalize amount (log scale)
    const normalizedAmount = Math.min(Math.log(transaction.amount + 1) / 15, 1);
    
    // Source and destination entity risk
    const sourceEntityRisk = entityRiskScores.get(transaction.sourceEntityId) || 0.5;
    const destEntityRisk = entityRiskScores.get(transaction.destinationEntityId) || 0.5;
    
    // Time features
    const txTime = new Date(transaction.timestamp);
    const hourOfDay = txTime.getHours() / 24; // Normalize to 0-1
    const dayOfWeek = txTime.getDay() / 6; // Normalize to 0-1
    
    // Category risk
    const isHighRiskCategory = (
      transaction.category === 'crypto' || transaction.category === 'cross_border'
    ) ? 1 : 0;
    
    // Cross-border indicator
    const isCrossBorder = transaction.category === 'cross_border' ? 1 : 0;
    
    // Transaction velocity (number of transactions in last 7 days)
    const txTime7DaysAgo = new Date(txTime.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentTxCount = recentTransactions.filter(tx => {
      const otherTxTime = new Date(tx.timestamp);
      return otherTxTime >= txTime7DaysAgo && otherTxTime <= txTime;
    }).length;
    
    const normalizedVelocity = Math.min(recentTxCount / 20, 1); // Normalize to 0-1 (max 20 tx/week)
    
    // Structuring indicator (multiple transactions just below reporting threshold)
    let structuringScore = 0;
    
    if (transaction.amount > this.REPORTING_THRESHOLD * 0.7 && 
        transaction.amount < this.REPORTING_THRESHOLD * 0.95) {
      // Look for other transactions from same source to same destination in last 7 days
      const similarTx = recentTransactions.filter(tx => 
        tx.id !== transaction.id &&
        tx.sourceEntityId === transaction.sourceEntityId &&
        tx.destinationEntityId === transaction.destinationEntityId &&
        new Date(tx.timestamp) >= txTime7DaysAgo
      );
      
      if (similarTx.length > 0) {
        structuringScore = 0.7;
      }
    }
    
    // Round-trip indicator (funds circling back)
    let roundTripScore = 0;
    
    // Look for transactions from destination back to source in last 30 days
    const txTime30DaysAgo = new Date(txTime.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const returnTx = recentTransactions.filter(tx =>
      tx.id !== transaction.id &&
      tx.sourceEntityId === transaction.destinationEntityId &&
      tx.destinationEntityId === transaction.sourceEntityId &&
      new Date(tx.timestamp) >= txTime30DaysAgo
    );
    
    if (returnTx.length > 0) {
      roundTripScore = 0.8;
    }
    
    return [
      normalizedAmount,
      sourceEntityRisk,
      destEntityRisk,
      hourOfDay,
      dayOfWeek,
      isHighRiskCategory,
      isCrossBorder,
      normalizedVelocity,
      structuringScore,
      roundTripScore
    ];
  }
  
  /**
   * Generate synthetic training data for entity risk scoring
   */
  private generateEntityTrainingData(
    entities: Entity[],
    transactions: Transaction[],
    entityRelationships: { [entityId: string]: number }
  ): {
    features: number[][];
    labels: number[][];
  } {
    const features: number[][] = [];
    const labels: number[][] = [];
    
    // Group transactions by entity
    const txByEntity = new Map<string, Transaction[]>();
    
    entities.forEach(entity => {
      txByEntity.set(entity.id, []);
    });
    
    transactions.forEach(tx => {
      // Add to source entity
      const sourceTxs = txByEntity.get(tx.sourceEntityId) || [];
      sourceTxs.push(tx);
      txByEntity.set(tx.sourceEntityId, sourceTxs);
      
      // Add to destination entity
      const destTxs = txByEntity.get(tx.destinationEntityId) || [];
      destTxs.push(tx);
      txByEntity.set(tx.destinationEntityId, destTxs);
    });
    
    // Calculate network centrality (simplified version)
    const centrality: { [entityId: string]: number } = {};
    
    entities.forEach(entity => {
      const numRelationships = entityRelationships[entity.id] || 0;
      // Simple centrality measure based on number of relationships
      centrality[entity.id] = numRelationships / Math.max(...Object.values(entityRelationships), 1);
    });
    
    // Prepare features and labels for each entity
    entities.forEach(entity => {
      const entityTxs = txByEntity.get(entity.id) || [];
      const numRelationships = entityRelationships[entity.id] || 0;
      
      // Prepare features
      const entityFeatures = this.prepareEntityFeatures(
        entity,
        entityTxs,
        centrality[entity.id] || 0,
        numRelationships
      );
      
      features.push(entityFeatures);
      
      // Use existing risk score as label (normalized to 0-1)
      const normalizedRiskScore = entity.riskScore / 100;
      labels.push([normalizedRiskScore]);
    });
    
    return { features, labels };
  }
  
  /**
   * Generate synthetic training data for transaction risk scoring
   */
  private generateTransactionTrainingData(
    transactions: Transaction[],
    entityRiskScores: Map<string, number>
  ): {
    features: number[][];
    labels: number[][];
  } {
    const features: number[][] = [];
    const labels: number[][] = [];
    
    // Sort transactions by timestamp
    const sortedTxs = [...transactions].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Prepare features and labels for each transaction
    sortedTxs.forEach((tx, index) => {
      // Use previous transactions as context
      const previousTxs = sortedTxs.slice(0, index);
      
      // Prepare features
      const txFeatures = this.prepareTransactionFeatures(tx, entityRiskScores, previousTxs);
      
      features.push(txFeatures);
      
      // Use existing risk score as label (normalized to 0-1)
      const normalizedRiskScore = tx.riskScore / 100;
      labels.push([normalizedRiskScore]);
    });
    
    return { features, labels };
  }
  
  /**
   * Train the entity risk scoring model
   */
  async trainEntityModel(
    entities: Entity[],
    transactions: Transaction[],
    relationships: { entityId: string, count: number }[]
  ): Promise<void> {
    if (entities.length < 10) {
      throw new Error('Insufficient data for training. Need at least 10 entities.');
    }
    
    console.log('Training entity risk scoring model...');
    
    // Convert relationships to a map for easier lookup
    const relationshipMap: { [entityId: string]: number } = {};
    relationships.forEach(rel => {
      relationshipMap[rel.entityId] = rel.count;
    });
    
    // Generate training data
    const { features, labels } = this.generateEntityTrainingData(
      entities,
      transactions,
      relationshipMap
    );
    
    // Convert to tensors
    const featureTensor = tf.tensor2d(features);
    const labelTensor = tf.tensor2d(labels);
    
    // Build model if not already built
    if (!this.entityModel) {
      this.entityModel = this.buildEntityModel();
    }
    
    // Train the model
    const history = await this.entityModel.fit(featureTensor, labelTensor, {
      epochs: 100,
      batchSize: 32,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            console.log(`Epoch ${epoch}: loss = ${logs?.loss.toFixed(5)}, mse = ${logs?.mse.toFixed(5)}`);
          }
        }
      }
    });
    
    console.log('Entity risk scoring model trained successfully');
    
    // Cleanup tensors
    featureTensor.dispose();
    labelTensor.dispose();
  }
  
  /**
   * Train the transaction risk scoring model
   */
  async trainTransactionModel(
    transactions: Transaction[],
    entities: Entity[]
  ): Promise<void> {
    if (transactions.length < 10) {
      throw new Error('Insufficient data for training. Need at least 10 transactions.');
    }
    
    console.log('Training transaction risk scoring model...');
    
    // Create entity risk score map
    const entityRiskScores = new Map<string, number>();
    entities.forEach(entity => {
      entityRiskScores.set(entity.id, entity.riskScore / 100);
    });
    
    // Generate training data
    const { features, labels } = this.generateTransactionTrainingData(
      transactions,
      entityRiskScores
    );
    
    // Convert to tensors
    const featureTensor = tf.tensor2d(features);
    const labelTensor = tf.tensor2d(labels);
    
    // Build model if not already built
    if (!this.transactionModel) {
      this.transactionModel = this.buildTransactionModel();
    }
    
    // Train the model
    const history = await this.transactionModel.fit(featureTensor, labelTensor, {
      epochs: 100,
      batchSize: 32,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            console.log(`Epoch ${epoch}: loss = ${logs?.loss.toFixed(5)}, mse = ${logs?.mse.toFixed(5)}`);
          }
        }
      }
    });
    
    console.log('Transaction risk scoring model trained successfully');
    
    // Cleanup tensors
    featureTensor.dispose();
    labelTensor.dispose();
  }
  
  /**
   * Train both entity and transaction risk scoring models
   */
  async trainModels(
    entities: Entity[],
    transactions: Transaction[],
    relationships: { entityId: string, count: number }[]
  ): Promise<void> {
    await this.trainEntityModel(entities, transactions, relationships);
    await this.trainTransactionModel(transactions, entities);
  }
  
  /**
   * Predict risk score for an entity
   */
  async predictEntityRisk(
    entity: Entity,
    transactions: Transaction[],
    centrality: number,
    relationshipCount: number
  ): Promise<{
    riskScore: number;
    riskFactors: { factor: string; contribution: number }[];
  }> {
    if (!this.entityModel) {
      throw new Error('Entity risk model not trained. Call trainEntityModel() first.');
    }
    
    // Prepare features
    const features = this.prepareEntityFeatures(
      entity,
      transactions,
      centrality,
      relationshipCount
    );
    
    // Convert to tensor
    const featureTensor = tf.tensor2d([features]);
    
    // Make prediction
    const prediction = this.entityModel.predict(featureTensor) as tf.Tensor;
    const [normalizedRiskScore] = await prediction.data();
    
    // Convert to 0-100 scale
    const riskScore = normalizedRiskScore * 100;
    
    // Calculate feature importance
    // This is a simplified approach - in a real system we would use SHAP values or similar
    const riskFactors = await this.calculateEntityRiskFactors(features);
    
    // Cleanup tensors
    featureTensor.dispose();
    prediction.dispose();
    
    return { riskScore, riskFactors };
  }
  
  /**
   * Predict risk score for a transaction
   */
  async predictTransactionRisk(
    transaction: Transaction,
    entityRiskScores: Map<string, number>,
    recentTransactions: Transaction[]
  ): Promise<{
    riskScore: number;
    riskLevel: string;
    riskFactors: { factor: string; contribution: number }[];
  }> {
    if (!this.transactionModel) {
      throw new Error('Transaction risk model not trained. Call trainTransactionModel() first.');
    }
    
    // Prepare features
    const features = this.prepareTransactionFeatures(
      transaction,
      entityRiskScores,
      recentTransactions
    );
    
    // Convert to tensor
    const featureTensor = tf.tensor2d([features]);
    
    // Make prediction
    const prediction = this.transactionModel.predict(featureTensor) as tf.Tensor;
    const [normalizedRiskScore] = await prediction.data();
    
    // Convert to 0-100 scale
    const riskScore = normalizedRiskScore * 100;
    
    // Get risk level
    const riskLevel = this.getRiskLevel(riskScore);
    
    // Calculate feature importance
    const riskFactors = await this.calculateTransactionRiskFactors(features);
    
    // Cleanup tensors
    featureTensor.dispose();
    prediction.dispose();
    
    return { riskScore, riskLevel, riskFactors };
  }
  
  /**
   * Calculate risk factors for entity
   */
  private async calculateEntityRiskFactors(
    features: number[]
  ): Promise<{ factor: string; contribution: number }[]> {
    const riskFactors: { factor: string; contribution: number }[] = [];
    
    // Map features to their names and normalized contribution
    let totalContribution = features.reduce((sum, val) => sum + val, 0);
    totalContribution = Math.max(totalContribution, 0.001); // Avoid division by zero
    
    for (let i = 0; i < features.length; i++) {
      if (features[i] > 0.1) { // Only include significant factors
        riskFactors.push({
          factor: this.getEntityFactorName(i),
          contribution: features[i] / totalContribution
        });
      }
    }
    
    // Sort by contribution (highest first)
    riskFactors.sort((a, b) => b.contribution - a.contribution);
    
    return riskFactors.slice(0, 5); // Return top 5 factors
  }
  
  /**
   * Calculate risk factors for transaction
   */
  private async calculateTransactionRiskFactors(
    features: number[]
  ): Promise<{ factor: string; contribution: number }[]> {
    const riskFactors: { factor: string; contribution: number }[] = [];
    
    // Map features to their names and normalized contribution
    let totalContribution = features.reduce((sum, val) => sum + val, 0);
    totalContribution = Math.max(totalContribution, 0.001); // Avoid division by zero
    
    for (let i = 0; i < features.length; i++) {
      if (features[i] > 0.1) { // Only include significant factors
        riskFactors.push({
          factor: this.getTransactionFactorName(i),
          contribution: features[i] / totalContribution
        });
      }
    }
    
    // Sort by contribution (highest first)
    riskFactors.sort((a, b) => b.contribution - a.contribution);
    
    return riskFactors.slice(0, 5); // Return top 5 factors
  }
  
  /**
   * Get human-readable name for entity risk factor
   */
  private getEntityFactorName(index: number): string {
    const factorNames = [
      'Entity Age',
      'Transaction Volume',
      'Average Transaction Size',
      'Maximum Transaction Size',
      'Transaction Frequency',
      'High-Risk Jurisdiction',
      'High-Risk Entity Type',
      'Network Centrality',
      'Number of Relationships',
      'Shell Company Indicators'
    ];
    
    return factorNames[index] || `Factor ${index}`;
  }
  
  /**
   * Get human-readable name for transaction risk factor
   */
  private getTransactionFactorName(index: number): string {
    const factorNames = [
      'Transaction Amount',
      'Source Entity Risk',
      'Destination Entity Risk',
      'Time of Day',
      'Day of Week',
      'High-Risk Category',
      'Cross-Border Transfer',
      'Transaction Velocity',
      'Structuring Indicator',
      'Round-Trip Indicator'
    ];
    
    return factorNames[index] || `Factor ${index}`;
  }
  
  /**
   * Get risk level from score
   */
  getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score < 30) {
      return 'low';
    } else if (score < 60) {
      return 'medium';
    } else if (score < 80) {
      return 'high';
    } else {
      return 'critical';
    }
  }
  
  /**
   * Save models to files
   */
  async saveModels(basePath: string): Promise<void> {
    if (this.entityModel) {
      await this.entityModel.save(`file://${basePath}/entity-risk-model`);
      console.log('Entity risk model saved successfully');
    }
    
    if (this.transactionModel) {
      await this.transactionModel.save(`file://${basePath}/transaction-risk-model`);
      console.log('Transaction risk model saved successfully');
    }
  }
  
  /**
   * Load models from files
   */
  async loadModels(basePath: string): Promise<void> {
    try {
      this.entityModel = await tf.loadLayersModel(`file://${basePath}/entity-risk-model/model.json`);
      console.log('Entity risk model loaded successfully');
      
      this.transactionModel = await tf.loadLayersModel(`file://${basePath}/transaction-risk-model/model.json`);
      console.log('Transaction risk model loaded successfully');
    } catch (error) {
      console.error('Failed to load risk models:', error);
      throw new Error('Failed to load risk models');
    }
  }
}

// Singleton instance for the application
export const riskScoringModel = new RiskScoringModel();