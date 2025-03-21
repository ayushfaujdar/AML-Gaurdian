import { FC } from "react";
import Sidebar from "@/components/dashboard/sidebar";
import Header from "@/components/dashboard/header";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { Case, Alert } from "@/types";
import { formatDate, getRiskColor, getStatusColor } from "@/lib/utils";

const InvestigationsPage: FC = () => {
  const { data: cases, isLoading: casesLoading, error: casesError } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });
  
  const { data: alerts, isLoading: alertsLoading, error: alertsError } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
  });
  
  // Get only in-progress cases
  const activeInvestigations = cases ? 
    cases.filter(c => c.status === "in progress" || c.status === "under investigation") : 
    [];
  
  // Get only under investigation alerts
  const activeAlerts = alerts ? 
    alerts.filter(a => a.status === "under investigation") : 
    [];

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Investigations" unreadNotifications={3} />
        
        <main className="flex-1 overflow-y-auto bg-neutral-50 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="flex flex-col items-center justify-center text-center p-6">
                <div className="text-3xl font-bold text-blue-700">
                  {casesLoading ? "--" : activeInvestigations.length}
                </div>
                <p className="text-blue-600">Active Cases</p>
              </CardContent>
            </Card>
            
            <Card className="bg-red-50 border-red-200">
              <CardContent className="flex flex-col items-center justify-center text-center p-6">
                <div className="text-3xl font-bold text-red-700">
                  {alertsLoading ? "--" : activeAlerts.length}
                </div>
                <p className="text-red-600">Open Alerts</p>
              </CardContent>
            </Card>
            
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="flex flex-col items-center justify-center text-center p-6">
                <div className="text-3xl font-bold text-orange-700">
                  {alertsLoading ? "--" : alerts?.filter(a => a.status === "pending").length || 0}
                </div>
                <p className="text-orange-600">Pending Alerts</p>
              </CardContent>
            </Card>
            
            <Card className="bg-green-50 border-green-200">
              <CardContent className="flex flex-col items-center justify-center text-center p-6">
                <div className="text-3xl font-bold text-green-700">
                  {casesLoading ? "--" : cases?.filter(c => c.status === "completed").length || 0}
                </div>
                <p className="text-green-600">Completed Cases</p>
              </CardContent>
            </Card>
          </div>
          
          <Tabs defaultValue="cases" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="cases">Active Cases</TabsTrigger>
              <TabsTrigger value="alerts">Open Alerts</TabsTrigger>
            </TabsList>
            
            <TabsContent value="cases">
              <Card>
                <CardHeader>
                  <CardTitle>Active Investigations</CardTitle>
                  <CardDescription>Cases currently under investigation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Case ID</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Assigned To</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Entities</TableHead>
                          <TableHead>Updated</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {casesLoading ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-6 text-neutral-500">
                              Loading active cases...
                            </TableCell>
                          </TableRow>
                        ) : casesError ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-6 text-red-500">
                              Error loading case data
                            </TableCell>
                          </TableRow>
                        ) : activeInvestigations.length > 0 ? (
                          activeInvestigations.map((caseItem) => (
                            <TableRow key={caseItem.id}>
                              <TableCell className="font-mono">{caseItem.id}</TableCell>
                              <TableCell className="font-medium">{caseItem.title}</TableCell>
                              <TableCell>{caseItem.assignedTo || "Unassigned"}</TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(caseItem.status)}>
                                  {caseItem.status.charAt(0).toUpperCase() + caseItem.status.slice(1).replace(/_/g, ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`border-${caseItem.priority}-500 text-${caseItem.priority}-700`}>
                                  {caseItem.priority.charAt(0).toUpperCase() + caseItem.priority.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell>{caseItem.entityIds.length}</TableCell>
                              <TableCell>{formatDate(caseItem.updatedAt)}</TableCell>
                              <TableCell>
                                <Button variant="outline" size="sm">
                                  Continue
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-6 text-neutral-500">
                              No active cases found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="alerts">
              <Card>
                <CardHeader>
                  <CardTitle>Open Alerts</CardTitle>
                  <CardDescription>Alerts currently under investigation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Alert ID</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Entity</TableHead>
                          <TableHead>Risk</TableHead>
                          <TableHead>Assigned To</TableHead>
                          <TableHead>Detected</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {alertsLoading ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-6 text-neutral-500">
                              Loading open alerts...
                            </TableCell>
                          </TableRow>
                        ) : alertsError ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-6 text-red-500">
                              Error loading alert data
                            </TableCell>
                          </TableRow>
                        ) : activeAlerts.length > 0 ? (
                          activeAlerts.map((alert) => (
                            <TableRow key={alert.id}>
                              <TableCell className="font-mono">{alert.id}</TableCell>
                              <TableCell className="font-medium">{alert.title}</TableCell>
                              <TableCell className="font-mono">{alert.entityId}</TableCell>
                              <TableCell>
                                <Badge className={getRiskColor(alert.riskLevel)}>
                                  {alert.riskScore} - {alert.riskLevel.charAt(0).toUpperCase() + alert.riskLevel.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell>{alert.assignedTo || "Unassigned"}</TableCell>
                              <TableCell>{formatDate(alert.timestamp)}</TableCell>
                              <TableCell>
                                <Button variant="outline" size="sm">
                                  Continue
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-6 text-neutral-500">
                              No open alerts found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Investigation Workflow</CardTitle>
              <CardDescription>Standard process for AML investigations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute top-0 bottom-0 left-8 w-0.5 bg-neutral-200"></div>
                
                <div className="relative pl-16 pb-8">
                  <div className="absolute left-5 top-2 w-6 h-6 rounded-full bg-blue-600 border-4 border-white flex items-center justify-center text-white">
                    1
                  </div>
                  <h3 className="text-lg font-medium mb-2">Alert Triage</h3>
                  <p className="text-neutral-600">Initial assessment of alerts to determine investigation priority and approach.</p>
                </div>
                
                <div className="relative pl-16 pb-8">
                  <div className="absolute left-5 top-2 w-6 h-6 rounded-full bg-blue-600 border-4 border-white flex items-center justify-center text-white">
                    2
                  </div>
                  <h3 className="text-lg font-medium mb-2">Data Collection</h3>
                  <p className="text-neutral-600">Gather relevant transaction data, entity information, and relationship contexts.</p>
                </div>
                
                <div className="relative pl-16 pb-8">
                  <div className="absolute left-5 top-2 w-6 h-6 rounded-full bg-blue-600 border-4 border-white flex items-center justify-center text-white">
                    3
                  </div>
                  <h3 className="text-lg font-medium mb-2">Analysis</h3>
                  <p className="text-neutral-600">Detailed examination of activity patterns, risk factors, and potential money laundering typologies.</p>
                </div>
                
                <div className="relative pl-16 pb-8">
                  <div className="absolute left-5 top-2 w-6 h-6 rounded-full bg-blue-600 border-4 border-white flex items-center justify-center text-white">
                    4
                  </div>
                  <h3 className="text-lg font-medium mb-2">Decision</h3>
                  <p className="text-neutral-600">Determine whether activity is suspicious and warrants regulatory reporting.</p>
                </div>
                
                <div className="relative pl-16">
                  <div className="absolute left-5 top-2 w-6 h-6 rounded-full bg-blue-600 border-4 border-white flex items-center justify-center text-white">
                    5
                  </div>
                  <h3 className="text-lg font-medium mb-2">Documentation & Reporting</h3>
                  <p className="text-neutral-600">File SAR/CTR reports as required and document investigation findings.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default InvestigationsPage;
