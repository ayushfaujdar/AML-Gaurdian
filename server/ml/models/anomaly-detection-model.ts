import * as tf from '@tensorflow/tfjs-node';
import { Transaction } from '@shared/schema';

/**
 * Autoencoder-based Anomaly Detection Model
 * 
 * This model uses an autoencoder neural network to learn the normal pattern
 * of transactions. Transactions that have high reconstruction error are
 * considered anomalous.
 */
export class AnomalyDetectionModel {
  private model: tf.LayersModel | null = null;
  private threshold: number = 0;
  private featureNames: string[] = [
    'amount', 'hour', 'dayOfWeek', 'sourceEntityRisk', 'destEntityRisk',
    'crossBorder', 'isCrypto', 'velocityScore'
  ];
  
  constructor() {}
  
  /**
   * Build the autoencoder model architecture
   */
  private buildModel(inputDim: number): tf.LayersModel {
    // Encoder
    const input = tf.layers.input({ shape: [inputDim] });
    const encoded = tf.layers.dense({
      units: 8,
      activation: 'relu',
      kernelRegularizer: tf.regularizers.l1l2({ l1: 1e-5, l2: 1e-5 })
    }).apply(input);
    
    const bottleneck = tf.layers.dense({
      units: 4,
      activation: 'relu',
      kernelRegularizer: tf.regularizers.l1l2({ l1: 1e-5, l2: 1e-5 })
    }).apply(encoded);
    
    // Decoder
    const decoded = tf.layers.dense({
      units: 8,
      activation: 'relu'
    }).apply(bottleneck);
    
    const output = tf.layers.dense({
      units: inputDim,
      activation: 'sigmoid'
    }).apply(decoded);
    
    // Create model
    const model = tf.model({ inputs: input, outputs: output as tf.SymbolicTensor });
    
    // Compile model
    model.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError'
    });
    
    return model;
  }
  
  /**
   * Preprocess transactions into tensors
   */
  private preprocessTransactions(transactions: Transaction[]): tf.Tensor2D {
    // Extract and normalize features
    const features = transactions.map(tx => {
      const timestamp = new Date(tx.timestamp);
      const hour = timestamp.getHours() / 24.0; // normalize to [0,1]
      const dayOfWeek = timestamp.getDay() / 6.0; // normalize to [0,1]
      
      // Normalize amount (using log to handle wide range of values)
      const amount = Math.log(tx.amount + 1) / 15.0; // assuming most amounts < exp(15)
      
      // Source and destination entity risk scores
      const sourceEntityRisk = tx.riskScore / 100.0;
      const destEntityRisk = tx.riskScore / 100.0; // This would ideally be the destination entity's risk score
      
      // Categorical features as binary
      const crossBorder = tx.category === 'cross_border' ? 1.0 : 0.0;
      const isCrypto = tx.category === 'crypto' ? 1.0 : 0.0;
      
      // Velocity score (would be calculated based on recent transaction frequency)
      const velocityScore = 0.5; // Placeholder - would be calculated from actual data
      
      return [
        amount, hour, dayOfWeek, sourceEntityRisk, destEntityRisk,
        crossBorder, isCrypto, velocityScore
      ];
    });
    
    return tf.tensor2d(features);
  }
  
  /**
   * Train the model on historical transaction data
   */
  async train(transactions: Transaction[]): Promise<void> {
    if (transactions.length < 10) {
      throw new Error('Insufficient data for training. Need at least 10 transactions.');
    }
    
    // Preprocess transactions
    const featureTensor = this.preprocessTransactions(transactions);
    const inputDim = featureTensor.shape[1];
    
    // Build model if not already built
    if (!this.model) {
      this.model = this.buildModel(inputDim);
    }
    
    // Train the model
    console.log('Training anomaly detection model...');
    const history = await this.model.fit(featureTensor, featureTensor, {
      epochs: 50,
      batchSize: 32,
      shuffle: true,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            console.log(`Epoch ${epoch}: loss = ${logs?.loss.toFixed(5)}`);
          }
        }
      }
    });
    
    // Calculate reconstruction error threshold (95th percentile)
    const predictions = this.model.predict(featureTensor) as tf.Tensor;
    const errors = tf.sub(featureTensor, predictions).square().mean(1);
    
    const errorValues = await errors.array();
    errorValues.sort((a, b) => a - b);
    
    // Set threshold at 95th percentile
    const thresholdIndex = Math.floor(errorValues.length * 0.95);
    this.threshold = errorValues[thresholdIndex];
    
    console.log(`Model trained. Threshold set to ${this.threshold.toFixed(5)}`);
    
    // Cleanup tensors
    featureTensor.dispose();
    predictions.dispose();
    errors.dispose();
  }
  
  /**
   * Detect anomalies in transactions
   * @returns Array of transaction IDs with anomaly scores
   */
  async detectAnomalies(transactions: Transaction[]): Promise<{
    transactionId: string;
    anomalyScore: number;
    isAnomaly: boolean;
  }[]> {
    if (!this.model) {
      throw new Error('Model not trained. Call train() first.');
    }
    
    // Preprocess transactions
    const featureTensor = this.preprocessTransactions(transactions);
    
    // Get predictions
    const predictions = this.model.predict(featureTensor) as tf.Tensor;
    
    // Calculate reconstruction error
    const errors = tf.sub(featureTensor, predictions).square().mean(1);
    const errorValues = await errors.array();
    
    // Map back to transactions with scores
    const results = transactions.map((tx, i) => {
      const anomalyScore = errorValues[i];
      return {
        transactionId: tx.id,
        anomalyScore,
        isAnomaly: anomalyScore > this.threshold
      };
    });
    
    // Cleanup tensors
    featureTensor.dispose();
    predictions.dispose();
    errors.dispose();
    
    return results;
  }
  
  /**
   * Save the model to files
   */
  async saveModel(path: string): Promise<void> {
    if (!this.model) {
      throw new Error('No model to save. Train the model first.');
    }
    
    await this.model.save(`file://${path}`);
    console.log(`Model saved to ${path}`);
  }
  
  /**
   * Load a previously saved model
   */
  async loadModel(path: string, threshold?: number): Promise<void> {
    this.model = await tf.loadLayersModel(`file://${path}/model.json`);
    console.log('Model loaded successfully');
    
    if (threshold) {
      this.threshold = threshold;
    }
  }
  
  /**
   * Explain why a transaction was flagged as anomalous
   */
  async explainAnomaly(transaction: Transaction): Promise<{
    factor: string;
    contribution: number;
  }[]> {
    if (!this.model) {
      throw new Error('Model not trained. Call train() first.');
    }
    
    // Preprocess the single transaction
    const featureTensor = this.preprocessTransactions([transaction]);
    
    // Get prediction
    const prediction = this.model.predict(featureTensor) as tf.Tensor;
    
    // Calculate error per feature
    const errors = tf.sub(featureTensor, prediction).square();
    const errorValues = await errors.array();
    
    // Map errors to features
    const featureErrors = this.featureNames.map((name, i) => ({
      factor: name,
      contribution: errorValues[0][i]
    }));
    
    // Sort by contribution (highest first)
    featureErrors.sort((a, b) => b.contribution - a.contribution);
    
    // Cleanup tensors
    featureTensor.dispose();
    prediction.dispose();
    errors.dispose();
    
    return featureErrors;
  }
}

// Singleton instance for the application
export const anomalyModel = new AnomalyDetectionModel();