import { Entity, EntityRelationship, Transaction, InsertEntity } from "@shared/schema";
import { storage } from "../storage";
import { calculateEntityRiskScores } from "../ml/risk-scoring";
import { generateId } from "../../client/src/lib/utils";

/**
 * Analyzes entity data to calculate risk scores and identify suspicious patterns
 * 
 * @param entities Entities to analyze
 * @param relationships Entity relationships
 * @param transactions Transactions involving the entities
 * @returns Updated entities with risk scores
 */
export async function analyzeEntityData(
  entities: Entity[],
  relationships: EntityRelationship[],
  transactions: Transaction[]
): Promise<Entity[]> {
  // Calculate risk scores for entities
  const entityRiskMap = calculateEntityRiskScores(entities, transactions);
  
  // Update entities with calculated risk scores
  const updatedEntities: Entity[] = [];
  
  for (const entity of entities) {
    const entityRisk = entityRiskMap.get(entity.id);
    
    if (entityRisk) {
      const riskScore = entityRisk.riskScore;
      let riskLevel: "low" | "medium" | "high" | "critical" = "low";
      
      // Determine risk level based on score
      if (riskScore >= 85) {
        riskLevel = "critical";
      } else if (riskScore >= 70) {
        riskLevel = "high";
      } else if (riskScore >= 40) {
        riskLevel = "medium";
      }
      
      // Only update if risk changed
      if (entity.riskScore !== riskScore || entity.riskLevel !== riskLevel) {
        const updatedEntity = await storage.updateEntity(entity.id, {
          riskScore,
          riskLevel,
          updatedAt: new Date()
        });
        
        if (updatedEntity) {
          updatedEntities.push(updatedEntity);
          
          // Log the risk change
          if (entity.riskLevel !== riskLevel) {
            await storage.createActivity({
              timestamp: new Date().toISOString(),
              userId: "system",
              actionType: "update",
              actionDescription: `Entity ${entity.id} risk level changed from ${entity.riskLevel} to ${riskLevel}`,
              entityId: entity.id,
              status: "completed",
              metadata: { 
                previousRiskScore: entity.riskScore,
                newRiskScore: riskScore,
                previousRiskLevel: entity.riskLevel,
                newRiskLevel: riskLevel,
                riskFactors: entityRisk.riskFactors
              }
            });
          }
        }
      } else {
        updatedEntities.push(entity);
      }
    } else {
      updatedEntities.push(entity);
    }
  }
  
  return updatedEntities;
}

/**
 * Gets the network data for a specific entity
 * 
 * @param entityId The central entity ID
 * @returns Network data including central entity, related entities and relationships
 */
export async function getEntityNetwork(entityId: string) {
  const entity = await storage.getEntity(entityId);
  
  if (!entity) {
    throw new Error(`Entity not found: ${entityId}`);
  }
  
  // Get relationships involving this entity
  const relationships = await storage.getEntityRelationshipsByEntity(entityId);
  
  // Get related entity IDs
  const relatedEntityIds = new Set<string>();
  
  relationships.forEach(rel => {
    if (rel.sourceEntityId === entityId) {
      relatedEntityIds.add(rel.targetEntityId);
    } else {
      relatedEntityIds.add(rel.sourceEntityId);
    }
  });
  
  // Get related entities
  const relatedEntities: Entity[] = [];
  
  for (const id of relatedEntityIds) {
    const relatedEntity = await storage.getEntity(id);
    if (relatedEntity) {
      relatedEntities.push(relatedEntity);
    }
  }
  
  return {
    centralEntity: entity,
    relationships,
    relatedEntities
  };
}

/**
 * Creates sample entities for testing the system
 * This would not be in a production system but is useful for demo purposes
 */
export async function createSampleEntities(count: number): Promise<Entity[]> {
  const entities: Entity[] = [];
  
  // Define jurisdictions with varying risk levels
  const jurisdictions = [
    "United States", "United Kingdom", "Germany", "France", 
    "Singapore", "Hong Kong", "Cayman Islands", "British Virgin Islands", 
    "Panama", "Belize", "Seychelles", "Marshall Islands"
  ];
  
  // Define entity types
  const entityTypes = [
    "individual", "corporate", "financial_institution", "government"
  ];
  
  for (let i = 0; i < count; i++) {
    const jurisdictionIndex = Math.floor(Math.random() * jurisdictions.length);
    const typeIndex = Math.floor(Math.random() * entityTypes.length);
    
    // Higher risk for offshore jurisdictions
    let initialRiskScore = 20;
    if (jurisdictionIndex >= 6) {
      initialRiskScore += 30;
    }
    
    // Determine initial risk level
    let riskLevel: "low" | "medium" | "high" | "critical" = "low";
    if (initialRiskScore >= 85) {
      riskLevel = "critical";
    } else if (initialRiskScore >= 70) {
      riskLevel = "high";
    } else if (initialRiskScore >= 40) {
      riskLevel = "medium";
    }
    
    // Generate a random past date (up to 3 years ago)
    const registrationDate = new Date();
    registrationDate.setFullYear(registrationDate.getFullYear() - Math.floor(Math.random() * 3));
    registrationDate.setMonth(Math.floor(Math.random() * 12));
    registrationDate.setDate(Math.floor(Math.random() * 28) + 1);
    
    const entityData: InsertEntity = {
      name: `Entity ${i + 1}`,
      type: entityTypes[typeIndex] as any,
      jurisdiction: jurisdictions[jurisdictionIndex],
      registrationDate: registrationDate.toISOString(),
      riskScore: initialRiskScore,
      riskLevel,
      status: "active",
      metadata: {}
    };
    
    const entity = await storage.createEntity(entityData);
    entities.push(entity);
  }
  
  return entities;
}

/**
 * Creates sample entity relationships for testing
 * This would not be in a production system but is useful for demo purposes
 */
export async function createSampleRelationships(entities: Entity[], count: number): Promise<EntityRelationship[]> {
  const relationships: EntityRelationship[] = [];
  
  // Define relationship types
  const relationshipTypes = [
    "owner", "beneficiary", "affiliate", "intermediary", "customer", "supplier"
  ];
  
  for (let i = 0; i < count; i++) {
    // Select random pair of entities
    const sourceIndex = Math.floor(Math.random() * entities.length);
    let targetIndex = Math.floor(Math.random() * entities.length);
    
    // Ensure different entities
    while (targetIndex === sourceIndex) {
      targetIndex = Math.floor(Math.random() * entities.length);
    }
    
    const sourceEntity = entities[sourceIndex];
    const targetEntity = entities[targetIndex];
    
    // Random relationship type
    const typeIndex = Math.floor(Math.random() * relationshipTypes.length);
    const type = relationshipTypes[typeIndex];
    
    // Generate random start date (up to 2 years ago)
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - Math.floor(Math.random() * 2));
    startDate.setMonth(Math.floor(Math.random() * 12));
    startDate.setDate(Math.floor(Math.random() * 28) + 1);
    
    // Sometimes include end date
    let endDate: string | undefined;
    if (Math.random() > 0.7) {
      const endDateObj = new Date(startDate);
      endDateObj.setMonth(endDateObj.getMonth() + Math.floor(Math.random() * 12) + 1);
      endDate = endDateObj.toISOString();
    }
    
    // Generate random strength (0.1 to 1.0)
    const strength = parseFloat((0.1 + Math.random() * 0.9).toFixed(2));
    
    const relationshipData = {
      sourceEntityId: sourceEntity.id,
      targetEntityId: targetEntity.id,
      relationshipType: type,
      strength,
      startDate: startDate.toISOString(),
      endDate,
      metadata: {}
    };
    
    const relationship = await storage.createEntityRelationship(relationshipData);
    relationships.push(relationship);
  }
  
  return relationships;
}
