import { Transaction, Entity } from "@shared/schema";

/**
 * Implementation of a simplified risk scoring model for AML
 * In a production environment, this would be a much more sophisticated model
 * trained on historical data with hundreds of risk factors.
 */
export function calculateRiskScore(transaction: any): number {
  // Initialize base risk score
  let riskScore = 20; // Start with a base score of 20 (out of 100)
  
  // 1. Transaction amount factors
  const amountFactors = evaluateAmountFactors(transaction);
  riskScore += amountFactors.score;
  
  // 2. Entity risk factors
  const entityFactors = evaluateEntityFactors(transaction);
  riskScore += entityFactors.score;
  
  // 3. Transaction type and category factors
  const typeFactors = evaluateTypeFactors(transaction);
  riskScore += typeFactors.score;
  
  // 4. Jurisdictional factors
  const jurisdictionFactors = evaluateJurisdictionFactors(transaction);
  riskScore += jurisdictionFactors.score;
  
  // 5. Time-based factors
  const timeFactors = evaluateTimeFactors(transaction);
  riskScore += timeFactors.score;
  
  // 6. Description/narrative factors
  const descriptionFactors = evaluateDescriptionFactors(transaction);
  riskScore += descriptionFactors.score;
  
  // Ensure score is between 0 and 100
  return Math.min(Math.max(riskScore, 0), 100);
}

/**
 * Evaluate risk factors related to transaction amount
 */
function evaluateAmountFactors(transaction: any): { score: number, factors: string[] } {
  let score = 0;
  const factors: string[] = [];
  
  // Check transaction amount
  const amount = transaction.amount;
  
  // Factor 1: Large transactions (>$10,000) are higher risk
  if (amount >= 10000) {
    const largeAmountScore = Math.min(5 + (amount - 10000) / 10000, 15);
    score += largeAmountScore;
    factors.push(`Large transaction amount: ${amount}`);
  }
  
  // Factor 2: Transactions just below reporting thresholds are suspicious
  if (amount >= 9000 && amount < 10000) {
    score += 20;
    factors.push("Transaction amount just below reporting threshold");
  }
  
  // Factor 3: Round numbers are sometimes indicators of money laundering
  if (amount >= 1000 && amount % 1000 === 0) {
    score += 5;
    factors.push("Suspiciously round transaction amount");
  }
  
  return { score, factors };
}

/**
 * Evaluate risk factors related to the entities involved
 */
function evaluateEntityFactors(transaction: any): { score: number, factors: string[] } {
  let score = 0;
  const factors: string[] = [];
  
  // For a real implementation, we would look up the entities in a database
  // and evaluate their risk profiles, history, etc.
  
  // Here we'll use some simplified checks based on the entity IDs and any
  // additional information provided in the transaction
  
  // Factor 1: Newly created entities are higher risk
  if (transaction.sourceEntityNewlyCreated || transaction.destinationEntityNewlyCreated) {
    score += 15;
    factors.push("Transaction involves newly created entity");
  }
  
  // Factor 2: Entities with known high risk scores
  if (transaction.sourceEntityRiskScore && transaction.sourceEntityRiskScore > 70) {
    score += 15;
    factors.push("Source entity has high risk score");
  }
  
  if (transaction.destinationEntityRiskScore && transaction.destinationEntityRiskScore > 70) {
    score += 15;
    factors.push("Destination entity has high risk score");
  }
  
  // Factor 3: First-time transaction between these entities
  if (transaction.isFirstTransaction) {
    score += 10;
    factors.push("First transaction between these entities");
  }
  
  return { score, factors };
}

/**
 * Evaluate risk factors related to transaction type and category
 */
function evaluateTypeFactors(transaction: any): { score: number, factors: string[] } {
  let score = 0;
  const factors: string[] = [];
  
  // Factor 1: Cross-border transactions are higher risk
  if (transaction.category === "cross_border") {
    score += 15;
    factors.push("Cross-border transaction");
  }
  
  // Factor 2: Crypto transactions can be higher risk due to pseudonymity
  if (transaction.category === "crypto") {
    score += 10;
    factors.push("Cryptocurrency transaction");
  }
  
  // Factor 3: Certain transaction types are higher risk
  if (transaction.type === "exchange") {
    score += 5;
    factors.push("Currency exchange transaction");
  }
  
  return { score, factors };
}

/**
 * Evaluate risk factors related to jurisdictions
 */
function evaluateJurisdictionFactors(transaction: any): { score: number, factors: string[] } {
  let score = 0;
  const factors: string[] = [];
  
  // High-risk jurisdictions (FATF high-risk and monitored jurisdictions, tax havens, etc.)
  const highRiskJurisdictions = [
    "Cayman Islands", "Panama", "British Virgin Islands", "Belize", 
    "Seychelles", "Vanuatu", "Marshall Islands", "Cyprus"
  ];
  
  // Factor 1: Source entity in high-risk jurisdiction
  if (transaction.sourceEntityJurisdiction && 
      highRiskJurisdictions.includes(transaction.sourceEntityJurisdiction)) {
    score += 20;
    factors.push(`Source entity in high-risk jurisdiction: ${transaction.sourceEntityJurisdiction}`);
  }
  
  // Factor 2: Destination entity in high-risk jurisdiction
  if (transaction.destinationEntityJurisdiction && 
      highRiskJurisdictions.includes(transaction.destinationEntityJurisdiction)) {
    score += 20;
    factors.push(`Destination entity in high-risk jurisdiction: ${transaction.destinationEntityJurisdiction}`);
  }
  
  return { score, factors };
}

/**
 * Evaluate risk factors related to timing
 */
function evaluateTimeFactors(transaction: any): { score: number, factors: string[] } {
  let score = 0;
  const factors: string[] = [];
  
  const timestamp = new Date(transaction.timestamp);
  const hours = timestamp.getHours();
  
  // Factor 1: Transactions outside normal business hours can be suspicious
  if (hours < 6 || hours >= 22) {
    score += 5;
    factors.push(`Transaction conducted outside business hours: ${hours}:00`);
  }
  
  // Factor 2: Transactions on weekends or holidays
  const day = timestamp.getDay();
  if (day === 0 || day === 6) { // Sunday or Saturday
    score += 5;
    factors.push("Transaction conducted on weekend");
  }
  
  return { score, factors };
}

/**
 * Evaluate risk factors in the transaction description/narrative
 */
function evaluateDescriptionFactors(transaction: any): { score: number, factors: string[] } {
  let score = 0;
  const factors: string[] = [];
  
  if (!transaction.description) {
    return { score, factors };
  }
  
  const description = transaction.description.toLowerCase();
  
  // Factor 1: Vague or generic descriptions
  const vaguePhrases = ["consulting", "services", "fees", "commission", "general", "miscellaneous"];
  
  for (const phrase of vaguePhrases) {
    if (description.includes(phrase)) {
      score += 10;
      factors.push(`Vague description containing "${phrase}"`);
      break; // Only count this factor once
    }
  }
  
  // Factor 2: Suspicious keywords
  const suspiciousKeywords = ["urgent", "fast", "immediate", "offshore", "confidential", "private"];
  
  for (const keyword of suspiciousKeywords) {
    if (description.includes(keyword)) {
      score += 15;
      factors.push(`Suspicious keyword in description: "${keyword}"`);
      break; // Only count this factor once
    }
  }
  
  // Factor 3: No description or very short description
  if (description.length < 5) {
    score += 10;
    factors.push("Missing or extremely short description");
  }
  
  return { score, factors };
}

/**
 * Calculate risk scores for entities based on their characteristics and transaction history
 */
export function calculateEntityRiskScores(
  entities: Entity[],
  transactions: Transaction[]
): Map<string, { riskScore: number, riskFactors: string[] }> {
  const entityRiskMap = new Map<string, { riskScore: number, riskFactors: string[] }>();
  
  // Group transactions by entity
  const entityTransactions = new Map<string, Transaction[]>();
  
  transactions.forEach(tx => {
    // Source entity
    if (!entityTransactions.has(tx.sourceEntityId)) {
      entityTransactions.set(tx.sourceEntityId, []);
    }
    entityTransactions.get(tx.sourceEntityId)!.push(tx);
    
    // Destination entity
    if (!entityTransactions.has(tx.destinationEntityId)) {
      entityTransactions.set(tx.destinationEntityId, []);
    }
    entityTransactions.get(tx.destinationEntityId)!.push(tx);
  });
  
  // Calculate risk score for each entity
  entities.forEach(entity => {
    const entityTxs = entityTransactions.get(entity.id) || [];
    
    // 1. Base risk score from entity characteristics
    let riskScore = 20; // Start with a base score
    const riskFactors: string[] = [];
    
    // 2. Jurisdiction risk
    const highRiskJurisdictions = [
      "Cayman Islands", "Panama", "British Virgin Islands", "Belize", 
      "Seychelles", "Vanuatu", "Marshall Islands", "Cyprus"
    ];
    
    if (highRiskJurisdictions.includes(entity.jurisdiction)) {
      riskScore += 25;
      riskFactors.push(`Registered in high-risk jurisdiction: ${entity.jurisdiction}`);
    }
    
    // 3. Age of entity
    const registrationDate = new Date(entity.registrationDate);
    const now = new Date();
    const ageInMonths = (now.getFullYear() - registrationDate.getFullYear()) * 12 + 
                        (now.getMonth() - registrationDate.getMonth());
    
    if (ageInMonths < 6) {
      riskScore += 15;
      riskFactors.push("Recently registered entity (less than 6 months old)");
    } else if (ageInMonths < 12) {
      riskScore += 10;
      riskFactors.push("Relatively new entity (less than 1 year old)");
    }
    
    // 4. Transaction patterns
    if (entityTxs.length > 0) {
      // 4.1 High volume of transactions
      if (entityTxs.length > 50) {
        riskScore += 10;
        riskFactors.push(`High transaction volume: ${entityTxs.length} transactions`);
      }
      
      // 4.2 High total transaction value
      const totalValue = entityTxs.reduce((sum, tx) => sum + tx.amount, 0);
      if (totalValue > 1000000) {
        riskScore += 15;
        riskFactors.push(`High total transaction value: $${totalValue}`);
      }
      
      // 4.3 Percentage of high-risk transactions
      const highRiskTxs = entityTxs.filter(tx => tx.riskScore > 70);
      const highRiskPercentage = (highRiskTxs.length / entityTxs.length) * 100;
      
      if (highRiskPercentage > 30) {
        riskScore += 20;
        riskFactors.push(`High percentage of risky transactions: ${highRiskPercentage.toFixed(1)}%`);
      } else if (highRiskPercentage > 10) {
        riskScore += 10;
        riskFactors.push(`Moderate percentage of risky transactions: ${highRiskPercentage.toFixed(1)}%`);
      }
    }
    
    // Ensure score is between 0 and 100
    riskScore = Math.min(Math.max(riskScore, 0), 100);
    
    entityRiskMap.set(entity.id, { riskScore, riskFactors });
  });
  
  return entityRiskMap;
}
