import { Entity, EntityRelationship, Transaction, storage } from '@shared/schema';
import { anomalyModel } from '../ml/models/anomaly-detection-model';
import { entityNetworkModel } from '../ml/models/entity-network-model';
import { transactionPatternModel } from '../ml/models/transaction-pattern-model';
import { riskScoringModel } from '../ml/models/risk-scoring-model';
import * as fs from 'fs';
import * as path from 'path';

// Directory for model storage
const MODEL_DIR = path.join(process.cwd(), 'server', 'ml', 'saved-models');

/**
 * Service for managing and using machine learning models
 */
export class MlService {
  private initialized = false;
  private isTraining = false;
  
  // In-memory caches for predictions
  private entityRiskCache = new Map<string, {
    riskScore: number;
    riskLevel: string;
    riskFactors: { factor: string; contribution: number }[];
  }>();
  
  private transactionRiskCache = new Map<string, {
    riskScore: number;
    riskLevel: string;
    riskFactors: { factor: string; contribution: number }[];
  }>();
  
  private suspiciousPatternsCache: {
    name: string;
    description: string;
    entities: string[];
    confidence: number;
    riskLevel: string;
  }[] = [];
  
  private anomalyCache = new Map<string, {
    transactionId: string;
    anomalyScore: number;
    isAnomaly: boolean;
  }>();
  
  /**
   * Initialize ML service and load models if available
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    // Create model directory if it doesn't exist
    try {
      if (!fs.existsSync(MODEL_DIR)) {
        fs.mkdirSync(MODEL_DIR, { recursive: true });
      }
      
      // Try to load saved models
      await this.loadModels();
      
      this.initialized = true;
      console.log('ML service initialized successfully');
    } catch (error) {
      console.error('Error initializing ML service:', error);
      
      // Continue without models - we'll train them later
      this.initialized = true;
      console.log('ML service initialized without pre-trained models');
    }
  }
  
  /**
   * Train all ML models
   */
  async trainAllModels(force = false): Promise<void> {
    if (this.isTraining) {
      console.log('Training already in progress, skipping request');
      return;
    }
    
    this.isTraining = true;
    
    try {
      console.log('Starting ML model training...');
      
      // Fetch all required data
      const entities = await storage.getAllEntities();
      const transactions = await storage.getAllTransactions();
      const entityRelationships = await storage.getAllEntityRelationships();
      
      // Train anomaly detection model
      console.log('Training anomaly detection model...');
      await anomalyModel.train(transactions);
      
      // Train entity network model
      console.log('Training entity network model...');
      await entityNetworkModel.train(entities, entityRelationships, transactions);
      
      // Train transaction pattern model
      console.log('Training transaction pattern model...');
      await transactionPatternModel.trainAllPatterns(transactions, entities);
      
      // Train risk scoring models
      console.log('Training risk scoring models...');
      
      // Calculate relationship counts for each entity
      const relationshipCounts = this.calculateRelationshipCounts(entityRelationships);
      
      await riskScoringModel.trainModels(
        entities,
        transactions,
        relationshipCounts
      );
      
      // Save all models
      await this.saveModels();
      
      console.log('All ML models trained successfully');
      
      // Clear caches
      this.clearCaches();
      
      // Run initial analysis on all data
      await this.analyzeAll();
      
    } catch (error) {
      console.error('Error training ML models:', error);
    } finally {
      this.isTraining = false;
    }
  }
  
  /**
   * Load all saved models
   */
  private async loadModels(): Promise<void> {
    const anomalyModelPath = path.join(MODEL_DIR, 'anomaly-model');
    const entityNetworkModelPath = path.join(MODEL_DIR, 'entity-network-model');
    const transactionPatternModelPath = path.join(MODEL_DIR, 'transaction-pattern-model');
    const riskScoringModelPath = path.join(MODEL_DIR, 'risk-scoring-model');
    
    // Load anomaly model if exists
    if (fs.existsSync(path.join(anomalyModelPath, 'model.json'))) {
      try {
        await anomalyModel.loadModel(anomalyModelPath);
        console.log('Loaded anomaly detection model');
      } catch (error) {
        console.error('Failed to load anomaly model:', error);
      }
    }
    
    // Load entity network model if exists
    if (fs.existsSync(path.join(entityNetworkModelPath, 'model.json'))) {
      try {
        await entityNetworkModel.loadModel(entityNetworkModelPath);
        console.log('Loaded entity network model');
      } catch (error) {
        console.error('Failed to load entity network model:', error);
      }
    }
    
    // Load transaction pattern models if exist
    if (fs.existsSync(path.join(transactionPatternModelPath, 'thresholds.json'))) {
      try {
        const thresholdsFile = path.join(transactionPatternModelPath, 'thresholds.json');
        const thresholds = JSON.parse(fs.readFileSync(thresholdsFile, 'utf8'));
        
        await transactionPatternModel.loadModels(transactionPatternModelPath, thresholds);
        console.log('Loaded transaction pattern models');
      } catch (error) {
        console.error('Failed to load transaction pattern models:', error);
      }
    }
    
    // Load risk scoring models if exist
    if (fs.existsSync(path.join(riskScoringModelPath, 'entity-risk-model', 'model.json'))) {
      try {
        await riskScoringModel.loadModels(riskScoringModelPath);
        console.log('Loaded risk scoring models');
      } catch (error) {
        console.error('Failed to load risk scoring models:', error);
      }
    }
  }
  
  /**
   * Save all trained models
   */
  private async saveModels(): Promise<void> {
    const anomalyModelPath = path.join(MODEL_DIR, 'anomaly-model');
    const entityNetworkModelPath = path.join(MODEL_DIR, 'entity-network-model');
    const transactionPatternModelPath = path.join(MODEL_DIR, 'transaction-pattern-model');
    const riskScoringModelPath = path.join(MODEL_DIR, 'risk-scoring-model');
    
    // Create directories if they don't exist
    fs.mkdirSync(anomalyModelPath, { recursive: true });
    fs.mkdirSync(entityNetworkModelPath, { recursive: true });
    fs.mkdirSync(transactionPatternModelPath, { recursive: true });
    fs.mkdirSync(riskScoringModelPath, { recursive: true });
    
    // Save anomaly model
    try {
      await anomalyModel.saveModel(anomalyModelPath);
    } catch (error) {
      console.error('Failed to save anomaly model:', error);
    }
    
    // Save entity network model
    try {
      await entityNetworkModel.saveModel(entityNetworkModelPath);
    } catch (error) {
      console.error('Failed to save entity network model:', error);
    }
    
    // Save transaction pattern models
    try {
      await transactionPatternModel.saveModels(transactionPatternModelPath);
    } catch (error) {
      console.error('Failed to save transaction pattern models:', error);
    }
    
    // Save risk scoring models
    try {
      await riskScoringModel.saveModels(riskScoringModelPath);
    } catch (error) {
      console.error('Failed to save risk scoring models:', error);
    }
    
    console.log('All models saved successfully');
  }
  
  /**
   * Analyze a single transaction for risks
   */
  async analyzeTransaction(transaction: Transaction): Promise<{
    riskScore: number;
    riskLevel: string;
    riskFactors: { factor: string; contribution: number }[];
    isAnomaly: boolean;
    anomalyScore: number;
  }> {
    // Check if we already have cached results
    const cachedRisk = this.transactionRiskCache.get(transaction.id);
    const cachedAnomaly = this.anomalyCache.get(transaction.id);
    
    if (cachedRisk && cachedAnomaly) {
      return {
        riskScore: cachedRisk.riskScore,
        riskLevel: cachedRisk.riskLevel,
        riskFactors: cachedRisk.riskFactors,
        isAnomaly: cachedAnomaly.isAnomaly,
        anomalyScore: cachedAnomaly.anomalyScore
      };
    }
    
    // Get entity risk scores for source and destination
    const [sourceEntity, destEntity] = await Promise.all([
      storage.getEntity(transaction.sourceEntityId),
      storage.getEntity(transaction.destinationEntityId)
    ]);
    
    const entityRiskScores = new Map<string, number>();
    
    if (sourceEntity) {
      entityRiskScores.set(sourceEntity.id, sourceEntity.riskScore / 100);
    }
    
    if (destEntity) {
      entityRiskScores.set(destEntity.id, destEntity.riskScore / 100);
    }
    
    // Get recent transactions for context
    const allTransactions = await storage.getAllTransactions();
    
    // Predict risk score
    let riskResult = {
      riskScore: transaction.riskScore,
      riskLevel: transaction.riskLevel,
      riskFactors: [{ factor: 'Default Risk Score', contribution: 1 }]
    };
    
    try {
      riskResult = await riskScoringModel.predictTransactionRisk(
        transaction,
        entityRiskScores,
        allTransactions
      );
      
      // Cache the result
      this.transactionRiskCache.set(transaction.id, {
        riskScore: riskResult.riskScore,
        riskLevel: riskScoringModel.getRiskLevel(riskResult.riskScore),
        riskFactors: riskResult.riskFactors
      });
    } catch (error) {
      console.error('Error predicting transaction risk:', error);
    }
    
    // Detect anomaly
    let anomalyResult = {
      transactionId: transaction.id,
      anomalyScore: 0,
      isAnomaly: false
    };
    
    try {
      // Run anomaly detection
      const anomalies = await anomalyModel.detectAnomalies([transaction]);
      
      if (anomalies && anomalies.length > 0) {
        anomalyResult = anomalies[0];
        
        // Cache the result
        this.anomalyCache.set(transaction.id, anomalyResult);
      }
    } catch (error) {
      console.error('Error detecting transaction anomalies:', error);
    }
    
    return {
      riskScore: riskResult.riskScore,
      riskLevel: riskScoringModel.getRiskLevel(riskResult.riskScore),
      riskFactors: riskResult.riskFactors,
      isAnomaly: anomalyResult.isAnomaly,
      anomalyScore: anomalyResult.anomalyScore
    };
  }
  
  /**
   * Analyze a single entity for risks
   */
  async analyzeEntity(entity: Entity): Promise<{
    riskScore: number;
    riskLevel: string;
    riskFactors: { factor: string; contribution: number }[];
  }> {
    // Check if we already have cached results
    const cachedRisk = this.entityRiskCache.get(entity.id);
    
    if (cachedRisk) {
      return {
        riskScore: cachedRisk.riskScore,
        riskLevel: cachedRisk.riskLevel,
        riskFactors: cachedRisk.riskFactors
      };
    }
    
    // Get entity transactions
    const allTransactions = await storage.getAllTransactions();
    const entityTransactions = allTransactions.filter(
      tx => tx.sourceEntityId === entity.id || tx.destinationEntityId === entity.id
    );
    
    // Get entity relationships
    const allRelationships = await storage.getAllEntityRelationships();
    const entityRelationships = allRelationships.filter(
      rel => rel.sourceEntityId === entity.id || rel.targetEntityId === entity.id
    );
    
    // Calculate centrality for the entity
    const relationshipCount = entityRelationships.length;
    
    // Simple centrality calculation
    const allEntities = await storage.getAllEntities();
    const maxRelationships = Math.max(
      ...allEntities.map(e => {
        const rels = allRelationships.filter(
          rel => rel.sourceEntityId === e.id || rel.targetEntityId === e.id
        );
        return rels.length;
      })
    );
    
    const centrality = maxRelationships > 0 ? relationshipCount / maxRelationships : 0;
    
    // Predict risk score
    let riskResult = {
      riskScore: entity.riskScore,
      riskLevel: entity.riskLevel,
      riskFactors: [{ factor: 'Default Risk Score', contribution: 1 }]
    };
    
    try {
      const result = await riskScoringModel.predictEntityRisk(
        entity,
        entityTransactions,
        centrality,
        relationshipCount
      );
      
      riskResult = {
        riskScore: result.riskScore,
        riskLevel: riskScoringModel.getRiskLevel(result.riskScore),
        riskFactors: result.riskFactors
      };
      
      // Cache the result
      this.entityRiskCache.set(entity.id, riskResult);
    } catch (error) {
      console.error('Error predicting entity risk:', error);
    }
    
    return riskResult;
  }
  
  /**
   * Analyze transaction patterns across all transactions
   */
  async analyzeTransactionPatterns(): Promise<{
    patterns: {
      name: string;
      description: string;
      transactions: string[];
      confidence: number;
      riskLevel: string;
    }[];
  }> {
    try {
      const [transactions, entities] = await Promise.all([
        storage.getAllTransactions(),
        storage.getAllEntities()
      ]);
      
      const result = await transactionPatternModel.detectPatterns(transactions, entities);
      
      // Cache the results
      this.suspiciousPatternsCache = result.patterns;
      
      return result;
    } catch (error) {
      console.error('Error analyzing transaction patterns:', error);
      return { patterns: [] };
    }
  }
  
  /**
   * Analyze entity networks
   */
  async analyzeEntityNetworks(): Promise<{
    suspiciousPatterns: {
      name: string;
      entities: string[];
      riskScore: number;
      description: string;
    }[];
    entityEmbeddings: Map<string, number[]>;
  }> {
    try {
      // This is already computed during model training
      const suspiciousPatterns = entityNetworkModel.getSuspiciousPatterns();
      const entityEmbeddings = entityNetworkModel.getEntityEmbeddings();
      
      return { suspiciousPatterns, entityEmbeddings };
    } catch (error) {
      console.error('Error analyzing entity networks:', error);
      return { suspiciousPatterns: [], entityEmbeddings: new Map() };
    }
  }
  
  /**
   * Detect anomalies across all transactions
   */
  async detectAnomalies(): Promise<{
    anomalies: {
      transactionId: string;
      anomalyScore: number;
      isAnomaly: boolean;
    }[];
  }> {
    try {
      const transactions = await storage.getAllTransactions();
      
      const anomalies = await anomalyModel.detectAnomalies(transactions);
      
      // Cache results
      anomalies.forEach(anomaly => {
        this.anomalyCache.set(anomaly.transactionId, anomaly);
      });
      
      return { anomalies };
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      return { anomalies: [] };
    }
  }
  
  /**
   * Explain why a transaction was flagged as anomalous
   */
  async explainAnomaly(transactionId: string): Promise<{
    factors: { factor: string; contribution: number }[];
  }> {
    try {
      const transaction = await storage.getTransaction(transactionId);
      
      if (!transaction) {
        throw new Error(`Transaction not found: ${transactionId}`);
      }
      
      const factors = await anomalyModel.explainAnomaly(transaction);
      
      return { factors };
    } catch (error) {
      console.error(`Error explaining anomaly for transaction ${transactionId}:`, error);
      return { factors: [] };
    }
  }
  
  /**
   * Analyze all data and update risk scores
   */
  async analyzeAll(): Promise<void> {
    console.log('Starting comprehensive analysis of all data...');
    
    try {
      // Get all data
      const [entities, transactions, relationships] = await Promise.all([
        storage.getAllEntities(),
        storage.getAllTransactions(),
        storage.getAllEntityRelationships()
      ]);
      
      // Detect anomalies
      console.log('Detecting anomalies...');
      const { anomalies } = await this.detectAnomalies();
      
      // Analyze transaction patterns
      console.log('Analyzing transaction patterns...');
      const { patterns } = await this.analyzeTransactionPatterns();
      
      // Analyze entity networks
      console.log('Analyzing entity networks...');
      const { suspiciousPatterns } = await this.analyzeEntityNetworks();
      
      // Update entity risk scores
      console.log('Updating entity risk scores...');
      for (const entity of entities) {
        const { riskScore, riskLevel } = await this.analyzeEntity(entity);
        
        // Only update if risk score is significantly different
        if (Math.abs(riskScore - entity.riskScore) > 5) {
          await storage.updateEntity(entity.id, {
            riskScore,
            riskLevel
          });
        }
      }
      
      // Update transaction risk scores
      console.log('Updating transaction risk scores...');
      for (const transaction of transactions) {
        const { riskScore, riskLevel, isAnomaly } = await this.analyzeTransaction(transaction);
        
        // Only update if risk score is significantly different
        if (Math.abs(riskScore - transaction.riskScore) > 5) {
          await storage.updateTransaction(transaction.id, {
            riskScore,
            riskLevel
          });
        }
        
        // Create alerts for anomalies
        if (isAnomaly) {
          await this.createAlertForAnomaly(transaction);
        }
      }
      
      // Create alerts for suspicious patterns
      console.log('Creating alerts for suspicious patterns...');
      for (const pattern of patterns) {
        await this.createAlertForPattern(pattern);
      }
      
      // Create alerts for suspicious entity networks
      console.log('Creating alerts for suspicious entity networks...');
      for (const pattern of suspiciousPatterns) {
        await this.createAlertForEntityPattern(pattern);
      }
      
      console.log('Comprehensive analysis completed successfully');
    } catch (error) {
      console.error('Error during comprehensive analysis:', error);
    }
  }
  
  /**
   * Create alert for an anomalous transaction
   */
  private async createAlertForAnomaly(transaction: Transaction): Promise<void> {
    // Check if alert already exists
    const existingAlerts = await storage.getAlertsByTransaction(transaction.id);
    
    if (existingAlerts.length > 0) {
      // Alert already exists, no need to create a new one
      return;
    }
    
    // Get more information about the anomaly
    const { factors } = await this.explainAnomaly(transaction.id);
    
    // Create alert description
    const topFactors = factors.slice(0, 3);
    const factorDesc = topFactors
      .map(f => `${f.factor} (${(f.contribution * 100).toFixed(1)}%)`)
      .join(', ');
    
    const description = `Transaction flagged as anomalous based on: ${factorDesc}`;
    
    // Create alert
    await storage.createAlert({
      entityId: transaction.sourceEntityId,
      transactionId: transaction.id,
      timestamp: new Date(),
      type: 'anomaly_detection',
      title: 'Anomalous Transaction Detected',
      description,
      riskScore: transaction.riskScore,
      riskLevel: transaction.riskLevel,
      status: 'pending',
      detectionMethod: 'Autoencoder Neural Network'
    });
  }
  
  /**
   * Create alert for a suspicious transaction pattern
   */
  private async createAlertForPattern(pattern: {
    name: string;
    description: string;
    transactions: string[];
    confidence: number;
    riskLevel: string;
  }): Promise<void> {
    if (pattern.transactions.length === 0) return;
    
    // Get the first transaction to find entities
    const firstTx = await storage.getTransaction(pattern.transactions[0]);
    
    if (!firstTx) return;
    
    // Check if alert already exists for this pattern
    const txIds = new Set(pattern.transactions);
    const existingAlerts = await storage.getAllAlerts();
    
    const patternAlreadyAlerted = existingAlerts.some(alert => 
      alert.type === 'transaction_pattern' &&
      alert.title.includes(pattern.name) &&
      alert.transactionId && 
      txIds.has(alert.transactionId)
    );
    
    if (patternAlreadyAlerted) {
      // Alert already exists, no need to create a new one
      return;
    }
    
    // Calculate risk score from confidence and pattern risk level
    let riskScore = pattern.confidence * 100;
    
    if (pattern.riskLevel === 'critical') {
      riskScore = Math.min(95, riskScore * 1.3);
    } else if (pattern.riskLevel === 'high') {
      riskScore = Math.min(85, riskScore * 1.2);
    } else if (pattern.riskLevel === 'medium') {
      riskScore = Math.min(70, riskScore * 1.1);
    } else {
      riskScore = Math.min(50, riskScore);
    }
    
    // Create alert
    await storage.createAlert({
      entityId: firstTx.sourceEntityId,
      transactionId: pattern.transactions[0],
      timestamp: new Date(),
      type: 'transaction_pattern',
      title: `${pattern.name} Pattern Detected`,
      description: `${pattern.description} (Confidence: ${(pattern.confidence * 100).toFixed(1)}%)`,
      riskScore,
      riskLevel: pattern.riskLevel,
      status: 'pending',
      detectionMethod: 'Neural Network Pattern Recognition'
    });
  }
  
  /**
   * Create alert for a suspicious entity network pattern
   */
  private async createAlertForEntityPattern(pattern: {
    name: string;
    entities: string[];
    riskScore: number;
    description: string;
  }): Promise<void> {
    if (pattern.entities.length === 0) return;
    
    // Get the first entity
    const firstEntityId = pattern.entities[0];
    
    // Check if alert already exists for this pattern
    const entityIds = new Set(pattern.entities);
    const existingAlerts = await storage.getAllAlerts();
    
    const patternAlreadyAlerted = existingAlerts.some(alert => 
      alert.type === 'network_activity' &&
      alert.title.includes(pattern.name) &&
      entityIds.has(alert.entityId)
    );
    
    if (patternAlreadyAlerted) {
      // Alert already exists, no need to create a new one
      return;
    }
    
    // Calculate risk level from risk score
    const riskLevel = riskScoringModel.getRiskLevel(pattern.riskScore * 100);
    
    // Create alert
    await storage.createAlert({
      entityId: firstEntityId,
      timestamp: new Date(),
      type: 'network_activity',
      title: `${pattern.name} Network Detected`,
      description: pattern.description,
      riskScore: pattern.riskScore * 100,
      riskLevel,
      status: 'pending',
      detectionMethod: 'Graph Neural Network'
    });
  }
  
  /**
   * Calculate relationship counts for each entity
   */
  private calculateRelationshipCounts(
    relationships: EntityRelationship[]
  ): { entityId: string; count: number }[] {
    const counts = new Map<string, number>();
    
    relationships.forEach(rel => {
      const sourceCount = counts.get(rel.sourceEntityId) || 0;
      counts.set(rel.sourceEntityId, sourceCount + 1);
      
      const targetCount = counts.get(rel.targetEntityId) || 0;
      counts.set(rel.targetEntityId, targetCount + 1);
    });
    
    return Array.from(counts.entries()).map(([entityId, count]) => ({
      entityId,
      count
    }));
  }
  
  /**
   * Clear all prediction caches
   */
  clearCaches(): void {
    this.entityRiskCache.clear();
    this.transactionRiskCache.clear();
    this.suspiciousPatternsCache = [];
    this.anomalyCache.clear();
  }
}

// Singleton instance
export const mlService = new MlService();