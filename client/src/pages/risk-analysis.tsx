import { FC } from "react";
import Sidebar from "@/components/dashboard/sidebar";
import Header from "@/components/dashboard/header";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { useRiskData } from "@/hooks/use-risk-data";
import RiskMap from "@/components/dashboard/risk-map";
import { useEntityData } from "@/hooks/use-entity-data";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, getRiskColor } from "@/lib/utils";
import { Entity } from "@/types";

const RiskAnalysis: FC = () => {
  const { riskHeatMapData, isLoading: riskLoading, error: riskError } = useRiskData();
  const { entities, isLoading: entitiesLoading, error: entitiesError } = useEntityData();
  
  // Sort entities by risk score (highest first)
  const sortedEntities = entities ? [...entities].sort((a, b) => b.riskScore - a.riskScore) : [];
  
  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Risk Analysis" unreadNotifications={3} />
        
        <main className="flex-1 overflow-y-auto bg-neutral-50 p-6">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="entities">Entity Risks</TabsTrigger>
              <TabsTrigger value="jurisdictions">Jurisdictional</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6">
              <RiskMap className="w-full" />
              
              <Card>
                <CardHeader>
                  <CardTitle>Risk Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-neutral-100 p-4 rounded-lg text-center">
                        <h3 className="text-xl font-bold text-red-600">
                          {entitiesLoading ? "--" : entities?.filter(e => e.riskLevel === "critical").length || 0}
                        </h3>
                        <p className="text-sm text-neutral-600">Critical Risk</p>
                      </div>
                      <div className="bg-neutral-100 p-4 rounded-lg text-center">
                        <h3 className="text-xl font-bold text-orange-600">
                          {entitiesLoading ? "--" : entities?.filter(e => e.riskLevel === "high").length || 0}
                        </h3>
                        <p className="text-sm text-neutral-600">High Risk</p>
                      </div>
                      <div className="bg-neutral-100 p-4 rounded-lg text-center">
                        <h3 className="text-xl font-bold text-yellow-600">
                          {entitiesLoading ? "--" : entities?.filter(e => e.riskLevel === "medium").length || 0}
                        </h3>
                        <p className="text-sm text-neutral-600">Medium Risk</p>
                      </div>
                      <div className="bg-neutral-100 p-4 rounded-lg text-center">
                        <h3 className="text-xl font-bold text-green-600">
                          {entitiesLoading ? "--" : entities?.filter(e => e.riskLevel === "low").length || 0}
                        </h3>
                        <p className="text-sm text-neutral-600">Low Risk</p>
                      </div>
                    </div>
                    
                    <div className="w-full h-10 bg-gray-200 rounded-full overflow-hidden">
                      <div className="flex h-full">
                        <div className="bg-red-500 h-full" style={{ width: `${entities ? (entities.filter(e => e.riskLevel === "critical").length / entities.length) * 100 : 0}%` }}></div>
                        <div className="bg-orange-500 h-full" style={{ width: `${entities ? (entities.filter(e => e.riskLevel === "high").length / entities.length) * 100 : 0}%` }}></div>
                        <div className="bg-yellow-500 h-full" style={{ width: `${entities ? (entities.filter(e => e.riskLevel === "medium").length / entities.length) * 100 : 0}%` }}></div>
                        <div className="bg-green-500 h-full" style={{ width: `${entities ? (entities.filter(e => e.riskLevel === "low").length / entities.length) * 100 : 0}%` }}></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="entities" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Entity Risk Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Entity ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Jurisdiction</TableHead>
                          <TableHead>Registration Date</TableHead>
                          <TableHead>Risk Score</TableHead>
                          <TableHead>Risk Level</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entitiesLoading ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-6 text-neutral-500">
                              Loading entities...
                            </TableCell>
                          </TableRow>
                        ) : entitiesError ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-6 text-red-500">
                              Error loading entity data
                            </TableCell>
                          </TableRow>
                        ) : sortedEntities.length > 0 ? (
                          sortedEntities.map((entity: Entity) => (
                            <TableRow key={entity.id}>
                              <TableCell className="font-mono">{entity.id}</TableCell>
                              <TableCell className="font-medium">{entity.name}</TableCell>
                              <TableCell>{entity.type.replace(/_/g, ' ')}</TableCell>
                              <TableCell>{entity.jurisdiction}</TableCell>
                              <TableCell>{formatDate(entity.registrationDate)}</TableCell>
                              <TableCell className="font-medium">{entity.riskScore.toFixed(1)}</TableCell>
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
                                >
                                  View Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-6 text-neutral-500">
                              No entities found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="jurisdictions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Jurisdictional Risk Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-neutral-500">
                    This feature is under development. Jurisdictional risk analysis will be available soon.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default RiskAnalysis;
