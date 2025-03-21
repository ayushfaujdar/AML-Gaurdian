import { FC, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize, MoreVertical } from "lucide-react";
import { useEntityData } from "@/hooks/use-entity-data";
import { getRiskColor } from "@/lib/utils";
import { EntityRelationship } from "@/types";

interface EntityNetworkProps {
  entityId?: string;
  className?: string;
}

type EntityNode = {
  id: string;
  position: { left: string; top: string };
  riskLevel: string;
  size?: "sm" | "md" | "lg";
};

type ConnectionLine = {
  from: string;
  to: string;
  angle: number;
  length: string;
};

const EntityNetwork: FC<EntityNetworkProps> = ({ entityId, className }) => {
  const { networkData, entityRelationships, isLoading, error } = useEntityData(entityId);
  const [nodes, setNodes] = useState<EntityNode[]>([]);
  const [connections, setConnections] = useState<ConnectionLine[]>([]);

  useEffect(() => {
    if (networkData?.centralEntity) {
      // Create nodes
      const centralNode: EntityNode = {
        id: networkData.centralEntity.id,
        position: { left: "50%", top: "50%" },
        riskLevel: networkData.centralEntity.riskLevel,
        size: "lg"
      };
      
      const relatedNodes: EntityNode[] = [];
      
      // Position related entities in a circle around the central entity
      if (networkData.relatedEntities && networkData.relatedEntities.length > 0) {
        const totalNodes = networkData.relatedEntities.length;
        const radius = 35; // % of container
        
        networkData.relatedEntities.forEach((entity, index) => {
          // Calculate position in a circle
          const angle = (Math.PI * 2 * index) / totalNodes;
          const left = 50 + radius * Math.cos(angle);
          const top = 50 + radius * Math.sin(angle);
          
          relatedNodes.push({
            id: entity.id,
            position: { left: `${left}%`, top: `${top}%` },
            riskLevel: entity.riskLevel,
            size: "md"
          });
          
          // Create connection from central to this node
          setConnections(prev => [
            ...prev,
            {
              from: centralNode.id,
              to: entity.id,
              angle: angle * (180 / Math.PI), // Convert to degrees
              length: `${radius}%`
            }
          ]);
        });
      }
      
      setNodes([centralNode, ...relatedNodes]);
    }
  }, [networkData]);

  return (
    <Card className={className}>
      <CardHeader className="px-6 py-4 border-b border-neutral-200 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-medium text-neutral-800">Entity Network Analysis</CardTitle>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-neutral-600">
            <Maximize className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-neutral-600">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="aspect-square bg-neutral-50 rounded h-64 flex items-center justify-center relative">
          {isLoading ? (
            <p className="text-neutral-500">Loading entity network...</p>
          ) : error ? (
            <p className="text-red-500">Error loading entity data</p>
          ) : (
            <>
              {/* Connection lines */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
                {connections.map((conn, index) => (
                  <div 
                    key={index} 
                    className="absolute w-[1px] bg-neutral-300 origin-top"
                    style={{
                      left: '50%',
                      top: '50%',
                      height: conn.length,
                      transform: `translateX(-50%) rotate(${conn.angle}deg)`
                    }}
                  ></div>
                ))}
              </div>
              
              {/* Entity nodes */}
              {nodes.map((node, index) => {
                const getRiskBgColor = (risk: string) => {
                  switch (risk) {
                    case "critical": return "bg-status-critical";
                    case "high": return "bg-status-warning";
                    case "medium": return "bg-status-info";
                    default: return "bg-status-success";
                  }
                };
                
                const getNodeSize = (size?: string) => {
                  switch (size) {
                    case "lg": return "w-10 h-10";
                    case "sm": return "w-6 h-6";
                    default: return "w-8 h-8";
                  }
                };

                return (
                  <div 
                    key={index}
                    className={`absolute rounded-full ${getRiskBgColor(node.riskLevel)} ${getNodeSize(node.size)} flex items-center justify-center text-white text-xs font-medium shadow-md z-20`}
                    style={{
                      left: node.position.left,
                      top: node.position.top,
                      transform: "translate(-50%, -50%)"
                    }}
                  >
                    {node.id.slice(0, 7)}
                  </div>
                );
              })}
            </>
          )}
        </div>
        
        <div className="mt-4">
          <h4 className="text-sm font-medium text-neutral-700 mb-2">High-Risk Entity Relationships</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-3 py-2 text-left text-neutral-600 font-medium">Entity ID</th>
                  <th className="px-3 py-2 text-left text-neutral-600 font-medium">Relationship</th>
                  <th className="px-3 py-2 text-left text-neutral-600 font-medium">Risk Score</th>
                  <th className="px-3 py-2 text-left text-neutral-600 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {entityRelationships?.length > 0 ? (
                  entityRelationships.map((rel: EntityRelationship, index: number) => {
                    // Calculate risk score based on relationship strength
                    const riskScore = Math.floor(rel.strength * 100);
                    const riskBgColor = 
                      riskScore >= 90 ? "bg-red-100 text-red-800" :
                      riskScore >= 70 ? "bg-orange-100 text-orange-800" :
                      "bg-yellow-100 text-yellow-800";
                    
                    return (
                      <tr key={index} className="hover:bg-neutral-50">
                        <td className="px-3 py-2 font-mono">
                          {rel.targetEntityId === networkData?.centralEntity.id 
                            ? rel.sourceEntityId 
                            : rel.targetEntityId}
                        </td>
                        <td className="px-3 py-2">{rel.relationshipType}</td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 ${riskBgColor} rounded-full`}>
                            {riskScore}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <Button 
                            variant="link" 
                            className="text-primary hover:text-primary/90 p-0 h-auto"
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-neutral-500">
                      No high-risk relationships found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EntityNetwork;
