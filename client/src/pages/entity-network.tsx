import { FC, useState } from "react";
import Sidebar from "@/components/dashboard/sidebar";
import Header from "@/components/dashboard/header";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import EntityNetwork from "@/components/dashboard/entity-network";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Network } from "lucide-react";
import { useEntityData } from "@/hooks/use-entity-data";
import { getRiskColor, formatDate } from "@/lib/utils";
import { Entity } from "@/types";

const EntityNetworkPage: FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<string | undefined>();
  const { entities, isLoading, error } = useEntityData();
  
  // Filter entities based on search
  const filteredEntities = entities?.filter(entity => 
    entity.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entity.jurisdiction.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Sort by risk score (highest first)
  const sortedEntities = filteredEntities ? 
    [...filteredEntities].sort((a, b) => b.riskScore - a.riskScore) : 
    [];
  
  const handleViewNetwork = (entityId: string) => {
    setSelectedEntity(entityId);
  };

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Entity Network Analysis" unreadNotifications={3} />
        
        <main className="flex-1 overflow-y-auto bg-neutral-50 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Entity Search</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative mb-4">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
                    <Input
                      type="search"
                      placeholder="Search entities..."
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div className="border rounded-md overflow-hidden max-h-[600px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Entity ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Risk</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4 text-neutral-500">
                              Loading entities...
                            </TableCell>
                          </TableRow>
                        ) : error ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4 text-red-500">
                              Error loading entities
                            </TableCell>
                          </TableRow>
                        ) : sortedEntities.length > 0 ? (
                          sortedEntities.map((entity: Entity) => (
                            <TableRow key={entity.id} className={selectedEntity === entity.id ? "bg-blue-50" : ""}>
                              <TableCell className="font-mono">{entity.id}</TableCell>
                              <TableCell>{entity.name}</TableCell>
                              <TableCell>
                                <Badge className={getRiskColor(entity.riskLevel)}>
                                  {entity.riskLevel.charAt(0).toUpperCase() + entity.riskLevel.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 px-2 text-xs"
                                  onClick={() => handleViewNetwork(entity.id)}
                                >
                                  <Network className="h-3 w-3 mr-1" />
                                  View Network
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4 text-neutral-500">
                              No entities found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-2 space-y-6">
              {selectedEntity ? (
                <>
                  <EntityNetwork entityId={selectedEntity} className="h-auto" />
                  
                  {entities?.find(e => e.id === selectedEntity) && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Entity Details</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const entity = entities.find(e => e.id === selectedEntity);
                          if (!entity) return null;
                          
                          return (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <div>
                                  <span className="text-sm text-neutral-500 block">ID</span>
                                  <span className="font-mono">{entity.id}</span>
                                </div>
                                <div>
                                  <span className="text-sm text-neutral-500 block">Name</span>
                                  <span>{entity.name}</span>
                                </div>
                                <div>
                                  <span className="text-sm text-neutral-500 block">Type</span>
                                  <span className="capitalize">{entity.type.replace(/_/g, ' ')}</span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div>
                                  <span className="text-sm text-neutral-500 block">Jurisdiction</span>
                                  <span>{entity.jurisdiction}</span>
                                </div>
                                <div>
                                  <span className="text-sm text-neutral-500 block">Registration Date</span>
                                  <span>{formatDate(entity.registrationDate)}</span>
                                </div>
                                <div>
                                  <span className="text-sm text-neutral-500 block">Risk Score</span>
                                  <Badge className={getRiskColor(entity.riskLevel)}>
                                    {entity.riskScore.toFixed(1)} - {entity.riskLevel.charAt(0).toUpperCase() + entity.riskLevel.slice(1)}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card className="h-full flex items-center justify-center">
                  <CardContent className="text-center py-12">
                    <Network className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-neutral-700 mb-2">No Entity Selected</h3>
                    <p className="text-neutral-500">
                      Select an entity from the list to view its network analysis.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EntityNetworkPage;
