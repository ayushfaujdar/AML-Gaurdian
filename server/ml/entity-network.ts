import { Entity, EntityRelationship } from "@shared/schema";

/**
 * Implementation of a simplified entity relationship analysis model
 * This would typically be implemented with graph neural networks in a production system
 */
export function analyzeEntityNetwork(
  entities: Entity[],
  relationships: EntityRelationship[]
) {
  // Create a graph representation of the entity network
  const graph = buildEntityGraph(entities, relationships);
  
  // Identify potential shell companies
  const shellCompanies = identifyShellCompanies(entities, relationships, graph);
  
  // Identify high-risk entity clusters
  const riskyClusters = identifyRiskyClusters(entities, relationships, graph);
  
  // Calculate centrality scores for entities (identifies key players in networks)
  const centralityScores = calculateCentrality(graph);
  
  // Detect circular ownership structures (common in money laundering)
  const circularStructures = detectCircularOwnership(graph);
  
  return {
    shellCompanies,
    riskyClusters,
    centralityScores,
    circularStructures
  };
}

/**
 * Build a graph representation of the entity network
 */
function buildEntityGraph(
  entities: Entity[],
  relationships: EntityRelationship[]
) {
  const graph = new Map<string, {
    entity: Entity;
    outgoing: Map<string, { relationship: EntityRelationship, targetEntity: Entity }[]>;
    incoming: Map<string, { relationship: EntityRelationship, sourceEntity: Entity }[]>;
  }>();
  
  // Add all entities to the graph
  entities.forEach(entity => {
    graph.set(entity.id, {
      entity,
      outgoing: new Map(),
      incoming: new Map()
    });
  });
  
  // Add relationships to the graph
  relationships.forEach(rel => {
    const sourceNode = graph.get(rel.sourceEntityId);
    const targetNode = graph.get(rel.targetEntityId);
    
    if (!sourceNode || !targetNode) return;
    
    // Add outgoing relationship
    if (!sourceNode.outgoing.has(rel.relationshipType)) {
      sourceNode.outgoing.set(rel.relationshipType, []);
    }
    sourceNode.outgoing.get(rel.relationshipType)!.push({
      relationship: rel,
      targetEntity: targetNode.entity
    });
    
    // Add incoming relationship
    if (!targetNode.incoming.has(rel.relationshipType)) {
      targetNode.incoming.set(rel.relationshipType, []);
    }
    targetNode.incoming.get(rel.relationshipType)!.push({
      relationship: rel,
      sourceEntity: sourceNode.entity
    });
  });
  
  return graph;
}

/**
 * Identify potential shell companies based on network characteristics
 */
function identifyShellCompanies(
  entities: Entity[],
  relationships: EntityRelationship[],
  graph: Map<string, any>
) {
  const shellCompanyCandidates: Entity[] = [];
  
  // Shell company indicators:
  // 1. High number of outgoing relationships compared to incoming
  // 2. Located in high-risk jurisdictions
  // 3. Recent registration date
  // 4. Strong connections to other high-risk entities
  
  const HIGH_RISK_JURISDICTIONS = [
    "Cayman Islands", "British Virgin Islands", "Panama", 
    "Belize", "Seychelles", "Marshall Islands"
  ];
  
  const ONE_YEAR_AGO = new Date();
  ONE_YEAR_AGO.setFullYear(ONE_YEAR_AGO.getFullYear() - 1);
  
  entities.forEach(entity => {
    let score = 0;
    const node = graph.get(entity.id);
    
    if (!node) return;
    
    // Check jurisdiction
    if (HIGH_RISK_JURISDICTIONS.includes(entity.jurisdiction)) {
      score += 30;
    }
    
    // Check registration date
    const registrationDate = new Date(entity.registrationDate);
    if (registrationDate > ONE_YEAR_AGO) {
      score += 20;
    }
    
    // Check relationship imbalance
    let outgoingCount = 0;
    node.outgoing.forEach((relationships: any[]) => {
      outgoingCount += relationships.length;
    });
    
    let incomingCount = 0;
    node.incoming.forEach((relationships: any[]) => {
      incomingCount += relationships.length;
    });
    
    // Many outgoing, few incoming
    if (outgoingCount > incomingCount * 3 && outgoingCount > 2) {
      score += 25;
    }
    
    // Check connections to high-risk entities
    let highRiskConnections = 0;
    
    node.outgoing.forEach((relationships: any[]) => {
      relationships.forEach(rel => {
        if (rel.targetEntity.riskLevel === "high" || rel.targetEntity.riskLevel === "critical") {
          highRiskConnections++;
        }
      });
    });
    
    node.incoming.forEach((relationships: any[]) => {
      relationships.forEach(rel => {
        if (rel.sourceEntity.riskLevel === "high" || rel.sourceEntity.riskLevel === "critical") {
          highRiskConnections++;
        }
      });
    });
    
    if (highRiskConnections > 0) {
      score += 5 * highRiskConnections;
    }
    
    // Consider entity a shell company candidate if score is high enough
    if (score >= 50) {
      shellCompanyCandidates.push(entity);
    }
  });
  
  return shellCompanyCandidates;
}

/**
 * Identify clusters of high-risk entities
 */
function identifyRiskyClusters(
  entities: Entity[],
  relationships: EntityRelationship[],
  graph: Map<string, any>
) {
  // Find clusters in the graph using a simple community detection algorithm
  // Here we'll use a basic approach - more sophisticated algorithms would be 
  // used in a real implementation (e.g., Louvain, Infomap)
  
  const visited = new Set<string>();
  const clusters: Entity[][] = [];
  
  // Find connected components
  entities.forEach(entity => {
    if (visited.has(entity.id)) return;
    
    const cluster: Entity[] = [];
    const queue: string[] = [entity.id];
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      
      visited.add(currentId);
      const node = graph.get(currentId);
      if (!node) continue;
      
      cluster.push(node.entity);
      
      // Add neighbors to queue
      node.outgoing.forEach((relationships: any[]) => {
        relationships.forEach(rel => {
          if (!visited.has(rel.targetEntity.id)) {
            queue.push(rel.targetEntity.id);
          }
        });
      });
      
      node.incoming.forEach((relationships: any[]) => {
        relationships.forEach(rel => {
          if (!visited.has(rel.sourceEntity.id)) {
            queue.push(rel.sourceEntity.id);
          }
        });
      });
    }
    
    // Only consider clusters with at least 3 entities
    if (cluster.length >= 3) {
      clusters.push(cluster);
    }
  });
  
  // Calculate risk score for each cluster
  const riskyClusters = clusters.map(cluster => {
    // Average risk score of entities in the cluster
    const avgRiskScore = cluster.reduce((sum, entity) => sum + entity.riskScore, 0) / cluster.length;
    
    // Count high-risk entities
    const highRiskCount = cluster.filter(entity => 
      entity.riskLevel === "high" || entity.riskLevel === "critical"
    ).length;
    
    // Calculate risk percentage
    const highRiskPercentage = (highRiskCount / cluster.length) * 100;
    
    return {
      entities: cluster,
      size: cluster.length,
      avgRiskScore,
      highRiskCount,
      highRiskPercentage,
      clusterRiskScore: avgRiskScore * (1 + highRiskPercentage / 100)
    };
  });
  
  // Sort clusters by risk score (descending)
  return riskyClusters.sort((a, b) => b.clusterRiskScore - a.clusterRiskScore);
}

/**
 * Calculate centrality scores for entities to identify key players in the network
 */
function calculateCentrality(graph: Map<string, any>) {
  const centralityScores = new Map<string, {
    entity: Entity;
    degreeCentrality: number;
    betweennessCentrality: number;
    overallScore: number;
  }>();
  
  // Calculate degree centrality (number of connections)
  graph.forEach((node, entityId) => {
    let connectionCount = 0;
    
    node.outgoing.forEach((relationships: any[]) => {
      connectionCount += relationships.length;
    });
    
    node.incoming.forEach((relationships: any[]) => {
      connectionCount += relationships.length;
    });
    
    // Simple approximation of betweenness centrality
    // In a real implementation, we would calculate this properly
    const betweennessCentrality = connectionCount * Math.random();
    
    // Overall influence score
    const overallScore = connectionCount * 0.7 + betweennessCentrality * 0.3;
    
    centralityScores.set(entityId, {
      entity: node.entity,
      degreeCentrality: connectionCount,
      betweennessCentrality,
      overallScore
    });
  });
  
  return Array.from(centralityScores.values())
    .sort((a, b) => b.overallScore - a.overallScore);
}

/**
 * Detect circular ownership structures
 */
function detectCircularOwnership(graph: Map<string, any>) {
  const circularStructures: { entities: Entity[], path: string[] }[] = [];
  
  // Look for ownership cycles using DFS
  graph.forEach((startNode, startEntityId) => {
    const visited = new Set<string>();
    const path: string[] = [];
    
    function dfs(currentEntityId: string) {
      visited.add(currentEntityId);
      path.push(currentEntityId);
      
      const currentNode = graph.get(currentEntityId);
      if (!currentNode) return;
      
      // Look at ownership relationships
      const ownershipRels = currentNode.outgoing.get("owner") || [];
      
      for (const rel of ownershipRels) {
        const targetEntityId = rel.targetEntity.id;
        
        // If we found a cycle back to the start entity
        if (targetEntityId === startEntityId && path.length > 1) {
          const cyclePath = [...path, startEntityId];
          const entities = cyclePath.map(id => graph.get(id).entity);
          
          circularStructures.push({
            entities,
            path: cyclePath
          });
          continue;
        }
        
        // Continue DFS if we haven't visited this entity
        if (!visited.has(targetEntityId)) {
          dfs(targetEntityId);
        }
      }
      
      // Backtrack
      path.pop();
      visited.delete(currentEntityId);
    }
    
    dfs(startEntityId);
  });
  
  return circularStructures;
}
