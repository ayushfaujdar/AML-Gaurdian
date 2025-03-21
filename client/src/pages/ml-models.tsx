import { FC, useState } from "react";
import Sidebar from "@/components/dashboard/sidebar";
import Header from "@/components/dashboard/header";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
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
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { 
  Brain, 
  RotateCcw, 
  BarChart, 
  TrendingUp, 
  Network, 
  AlertTriangle, 
  Plus, 
  Play, 
  LineChart,
  Layers,
  Pause
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface ModelPerformance {
  id: string;
  name: string;
  type: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  lastTrainedDate: string;
  status: string;
}

const MlModelsPage: FC = () => {
  const [trainingModel, setTrainingModel] = useState<boolean>(false);
  const [trainingProgress, setTrainingProgress] = useState<number>(0);
  const [selectedModel, setSelectedModel] = useState<ModelPerformance | null>(null);
  const [modelDialogOpen, setModelDialogOpen] = useState<boolean>(false);
  const [createModelOpen, setCreateModelOpen] = useState<boolean>(false);
  
  const { data: models, isLoading, error } = useQuery<ModelPerformance[]>({
    queryKey: ["/api/ml-models"],
  });
  
  const startModelTraining = (model: ModelPerformance) => {
    setTrainingModel(true);
    setTrainingProgress(0);
    
    // Simulate training progress
    const interval = setInterval(() => {
      setTrainingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTrainingModel(false);
          return 100;
        }
        return prev + 5;
      });
    }, 500);
  };
  
  const viewModelDetails = (model: ModelPerformance) => {
    setSelectedModel(model);
    setModelDialogOpen(true);
  };
  
  const getModelTypeIcon = (type: string) => {
    switch(type) {
      case "transaction_pattern":
        return <TrendingUp className="h-5 w-5" />;
      case "entity_relationship":
        return <Network className="h-5 w-5" />;
      case "anomaly_detection":
        return <AlertTriangle className="h-5 w-5" />;
      case "risk_scoring":
        return <BarChart className="h-5 w-5" />;
      default:
        return <Brain className="h-5 w-5" />;
    }
  };
  
  const getModelTypeLabel = (type: string) => {
    switch(type) {
      case "transaction_pattern":
        return "Transaction Pattern";
      case "entity_relationship":
        return "Entity Relationship";
      case "anomaly_detection":
        return "Anomaly Detection";
      case "risk_scoring":
        return "Risk Scoring";
      default:
        return type;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch(status) {
      case "training":
        return "bg-blue-100 text-blue-800";
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-neutral-100 text-neutral-800";
      default:
        return "bg-neutral-100 text-neutral-800";
    }
  };

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="ML Models" unreadNotifications={3} />
        
        <main className="flex-1 overflow-y-auto bg-neutral-50 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Machine Learning Models</h1>
              <p className="text-neutral-500">Manage and monitor your AML detection models</p>
            </div>
            <Button onClick={() => setCreateModelOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Model
            </Button>
          </div>
          
          <Tabs defaultValue="models" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="models">Active Models</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="training">Training Data</TabsTrigger>
            </TabsList>
            
            <TabsContent value="models">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <Brain className="h-5 w-5 text-blue-600" />
                      </div>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <h2 className="text-lg font-medium text-neutral-900">Transaction Pattern Model</h2>
                    <p className="text-sm text-neutral-600 mt-2">Detects unusual transaction patterns and structuring attempts</p>
                    <div className="mt-4">
                      <p className="text-sm text-neutral-600">Accuracy</p>
                      <div className="flex items-center justify-between">
                        <Progress className="h-2" value={94} />
                        <span className="ml-2 text-sm font-medium">94%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-purple-100 rounded-full">
                        <Network className="h-5 w-5 text-purple-600" />
                      </div>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <h2 className="text-lg font-medium text-neutral-900">Entity Relationship Model</h2>
                    <p className="text-sm text-neutral-600 mt-2">Identifies suspicious entity networks and shell companies</p>
                    <div className="mt-4">
                      <p className="text-sm text-neutral-600">Accuracy</p>
                      <div className="flex items-center justify-between">
                        <Progress className="h-2" value={88} />
                        <span className="ml-2 text-sm font-medium">88%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-orange-100 rounded-full">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                      </div>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <h2 className="text-lg font-medium text-neutral-900">Anomaly Detection Model</h2>
                    <p className="text-sm text-neutral-600 mt-2">Detects unusual behavioral patterns using unsupervised learning</p>
                    <div className="mt-4">
                      <p className="text-sm text-neutral-600">Accuracy</p>
                      <div className="flex items-center justify-between">
                        <Progress className="h-2" value={91} />
                        <span className="ml-2 text-sm font-medium">91%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-green-100 rounded-full">
                        <BarChart className="h-5 w-5 text-green-600" />
                      </div>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <h2 className="text-lg font-medium text-neutral-900">Risk Scoring Model</h2>
                    <p className="text-sm text-neutral-600 mt-2">Calculates comprehensive risk scores based on multiple factors</p>
                    <div className="mt-4">
                      <p className="text-sm text-neutral-600">Accuracy</p>
                      <div className="flex items-center justify-between">
                        <Progress className="h-2" value={97} />
                        <span className="ml-2 text-sm font-medium">97%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>ML Model Management</CardTitle>
                  <CardDescription>
                    View and manage machine learning models used for AML detection
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Model</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Accuracy</TableHead>
                          <TableHead>Precision</TableHead>
                          <TableHead>Recall</TableHead>
                          <TableHead>F1 Score</TableHead>
                          <TableHead>Last Trained</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-6 text-neutral-500">
                              Loading models...
                            </TableCell>
                          </TableRow>
                        ) : error ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-6 text-red-500">
                              Error loading models
                            </TableCell>
                          </TableRow>
                        ) : models && models.length > 0 ? (
                          models.map((model) => (
                            <TableRow key={model.id}>
                              <TableCell className="font-medium">{model.name}</TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <div className="mr-2">{getModelTypeIcon(model.type)}</div>
                                  {getModelTypeLabel(model.type)}
                                </div>
                              </TableCell>
                              <TableCell>{(model.accuracy * 100).toFixed(1)}%</TableCell>
                              <TableCell>{(model.precision * 100).toFixed(1)}%</TableCell>
                              <TableCell>{(model.recall * 100).toFixed(1)}%</TableCell>
                              <TableCell>{(model.f1Score * 100).toFixed(1)}%</TableCell>
                              <TableCell>{formatDate(model.lastTrainedDate)}</TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(model.status)}>
                                  {model.status.charAt(0).toUpperCase() + model.status.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="h-8"
                                    onClick={() => viewModelDetails(model)}
                                  >
                                    <BarChart className="h-3.5 w-3.5 mr-1" />
                                    Details
                                  </Button>
                                  <Button 
                                    variant={model.status === 'training' ? "outline" : "default"} 
                                    size="sm"
                                    className="h-8"
                                    onClick={() => startModelTraining(model)}
                                    disabled={model.status === 'training' || trainingModel}
                                  >
                                    {model.status === 'training' ? (
                                      <>
                                        <Pause className="h-3.5 w-3.5 mr-1" />
                                        Training...
                                      </>
                                    ) : (
                                      <>
                                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                        Retrain
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-6 text-neutral-500">
                              No models found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {trainingModel && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-md">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-medium text-blue-800">Model Training in Progress</h3>
                        <Badge className="bg-blue-100 text-blue-800">{trainingProgress}%</Badge>
                      </div>
                      <Progress value={trainingProgress} className="h-2" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="performance">
              <Card>
                <CardHeader>
                  <CardTitle>Model Performance Metrics</CardTitle>
                  <CardDescription>
                    Detailed performance analytics for each ML model
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Transaction Pattern Model Performance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 flex items-center justify-center bg-neutral-50 rounded-md">
                          <LineChart className="h-16 w-16 text-neutral-300" />
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-neutral-500">False Positive Rate</p>
                            <p className="text-lg font-medium">0.8%</p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-500">False Negative Rate</p>
                            <p className="text-lg font-medium">0.4%</p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-500">Processing Time</p>
                            <p className="text-lg font-medium">142ms</p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-500">Alerts Generated</p>
                            <p className="text-lg font-medium">523</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Entity Relationship Model Performance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 flex items-center justify-center bg-neutral-50 rounded-md">
                          <LineChart className="h-16 w-16 text-neutral-300" />
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-neutral-500">Shell Company Detection</p>
                            <p className="text-lg font-medium">91.6%</p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-500">Network Accuracy</p>
                            <p className="text-lg font-medium">88.3%</p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-500">Processing Time</p>
                            <p className="text-lg font-medium">324ms</p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-500">Entities Flagged</p>
                            <p className="text-lg font-medium">87</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Over Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80 flex items-center justify-center bg-neutral-50 rounded-md">
                        <LineChart className="h-16 w-16 text-neutral-300" />
                        <p className="text-neutral-500">Performance trend visualization</p>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="training">
              <Card>
                <CardHeader>
                  <CardTitle>Model Training Data</CardTitle>
                  <CardDescription>
                    Manage the training datasets for your ML models
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-medium">Training Dataset Statistics</h3>
                        <p className="text-neutral-500">Overview of available training data for models</p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Import Dataset
                        </Button>
                        <Button variant="outline">
                          <Layers className="h-4 w-4 mr-2" />
                          Generate Synthetic Data
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start">
                            <h3 className="font-medium">Transaction Datasets</h3>
                            <Badge>3 Sets</Badge>
                          </div>
                          <p className="text-2xl font-bold mt-3">456,829</p>
                          <p className="text-sm text-neutral-500">Records</p>
                          <Progress className="mt-3" value={85} />
                          <p className="text-xs text-neutral-500 mt-2">85% labeled data</p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start">
                            <h3 className="font-medium">Entity Datasets</h3>
                            <Badge>2 Sets</Badge>
                          </div>
                          <p className="text-2xl font-bold mt-3">34,572</p>
                          <p className="text-sm text-neutral-500">Records</p>
                          <Progress className="mt-3" value={92} />
                          <p className="text-xs text-neutral-500 mt-2">92% labeled data</p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start">
                            <h3 className="font-medium">Relationship Datasets</h3>
                            <Badge>4 Sets</Badge>
                          </div>
                          <p className="text-2xl font-bold mt-3">127,384</p>
                          <p className="text-sm text-neutral-500">Records</p>
                          <Progress className="mt-3" value={78} />
                          <p className="text-xs text-neutral-500 mt-2">78% labeled data</p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start">
                            <h3 className="font-medium">AML Typologies</h3>
                            <Badge>15 Types</Badge>
                          </div>
                          <p className="text-2xl font-bold mt-3">86</p>
                          <p className="text-sm text-neutral-500">Patterns</p>
                          <Progress className="mt-3" value={100} />
                          <p className="text-xs text-neutral-500 mt-2">100% coverage</p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Training Datasets</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="border rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Dataset Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Records</TableHead>
                                <TableHead>Labeling Status</TableHead>
                                <TableHead>Last Updated</TableHead>
                                <TableHead>Used By Models</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell className="font-medium">Transaction_Historical_2022</TableCell>
                                <TableCell>Transaction</TableCell>
                                <TableCell>245,639</TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <Progress className="h-2 w-20 mr-2" value={100} />
                                    <span className="text-sm">100%</span>
                                  </div>
                                </TableCell>
                                <TableCell>Mar 12, 2023</TableCell>
                                <TableCell>2 models</TableCell>
                                <TableCell className="text-right">
                                  <Button variant="outline" size="sm">View</Button>
                                </TableCell>
                              </TableRow>
                              
                              <TableRow>
                                <TableCell className="font-medium">Transaction_Q1_2023</TableCell>
                                <TableCell>Transaction</TableCell>
                                <TableCell>112,374</TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <Progress className="h-2 w-20 mr-2" value={85} />
                                    <span className="text-sm">85%</span>
                                  </div>
                                </TableCell>
                                <TableCell>Apr 30, 2023</TableCell>
                                <TableCell>1 model</TableCell>
                                <TableCell className="text-right">
                                  <Button variant="outline" size="sm">View</Button>
                                </TableCell>
                              </TableRow>
                              
                              <TableRow>
                                <TableCell className="font-medium">Shell_Company_Patterns</TableCell>
                                <TableCell>Entity</TableCell>
                                <TableCell>12,847</TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <Progress className="h-2 w-20 mr-2" value={100} />
                                    <span className="text-sm">100%</span>
                                  </div>
                                </TableCell>
                                <TableCell>Jan 15, 2023</TableCell>
                                <TableCell>3 models</TableCell>
                                <TableCell className="text-right">
                                  <Button variant="outline" size="sm">View</Button>
                                </TableCell>
                              </TableRow>
                              
                              <TableRow>
                                <TableCell className="font-medium">Synthetic_Fraud_Scenarios</TableCell>
                                <TableCell>Mixed</TableCell>
                                <TableCell>35,000</TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <Progress className="h-2 w-20 mr-2" value={100} />
                                    <span className="text-sm">100%</span>
                                  </div>
                                </TableCell>
                                <TableCell>May 20, 2023</TableCell>
                                <TableCell>4 models</TableCell>
                                <TableCell className="text-right">
                                  <Button variant="outline" size="sm">View</Button>
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
      
      {/* Model Details Dialog */}
      {selectedModel && (
        <Dialog open={modelDialogOpen} onOpenChange={setModelDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedModel.name}</DialogTitle>
              <DialogDescription>
                {getModelTypeLabel(selectedModel.type)} model details and performance metrics
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-500">Model Type</h3>
                  <p className="text-base">{getModelTypeLabel(selectedModel.type)}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-500">Status</h3>
                  <Badge className={getStatusColor(selectedModel.status)}>
                    {selectedModel.status.charAt(0).toUpperCase() + selectedModel.status.slice(1)}
                  </Badge>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-500">Last Trained</h3>
                  <p className="text-base">{formatDate(selectedModel.lastTrainedDate)}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-500">Accuracy</h3>
                  <div className="flex items-center">
                    <Progress className="h-2 flex-1 mr-2" value={selectedModel.accuracy * 100} />
                    <span className="text-base font-medium">{(selectedModel.accuracy * 100).toFixed(1)}%</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-500">Precision</h3>
                  <div className="flex items-center">
                    <Progress className="h-2 flex-1 mr-2" value={selectedModel.precision * 100} />
                    <span className="text-base font-medium">{(selectedModel.precision * 100).toFixed(1)}%</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-500">Recall</h3>
                  <div className="flex items-center">
                    <Progress className="h-2 flex-1 mr-2" value={selectedModel.recall * 100} />
                    <span className="text-base font-medium">{(selectedModel.recall * 100).toFixed(1)}%</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-500">F1 Score</h3>
                  <div className="flex items-center">
                    <Progress className="h-2 flex-1 mr-2" value={selectedModel.f1Score * 100} />
                    <span className="text-base font-medium">{(selectedModel.f1Score * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-500">Error Analysis</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-neutral-50 rounded-md">
                  <p className="text-sm font-medium text-neutral-700">False Positive Rate</p>
                  <p className="text-xl font-bold text-red-600">{(selectedModel.falsePositiveRate * 100).toFixed(2)}%</p>
                </div>
                
                <div className="p-3 bg-neutral-50 rounded-md">
                  <p className="text-sm font-medium text-neutral-700">False Negative Rate</p>
                  <p className="text-xl font-bold text-red-600">{(selectedModel.falseNegativeRate * 100).toFixed(2)}%</p>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setModelDialogOpen(false)}>Close</Button>
              <Button 
                onClick={() => {
                  setModelDialogOpen(false);
                  startModelTraining(selectedModel);
                }}
                disabled={selectedModel.status === 'training' || trainingModel}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Retrain Model
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Create Model Dialog */}
      <Dialog open={createModelOpen} onOpenChange={setCreateModelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Model</DialogTitle>
            <DialogDescription>
              Configure the parameters for your new ML model
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="model-name">Model Name</Label>
              <Input id="model-name" placeholder="Enter model name" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="model-type">Model Type</Label>
              <Select>
                <SelectTrigger id="model-type">
                  <SelectValue placeholder="Select model type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transaction_pattern">Transaction Pattern</SelectItem>
                  <SelectItem value="entity_relationship">Entity Relationship</SelectItem>
                  <SelectItem value="anomaly_detection">Anomaly Detection</SelectItem>
                  <SelectItem value="risk_scoring">Risk Scoring</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dataset">Training Dataset</Label>
              <Select>
                <SelectTrigger id="dataset">
                  <SelectValue placeholder="Select dataset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transaction_historical">Transaction_Historical_2022</SelectItem>
                  <SelectItem value="transaction_q1">Transaction_Q1_2023</SelectItem>
                  <SelectItem value="shell_company">Shell_Company_Patterns</SelectItem>
                  <SelectItem value="synthetic">Synthetic_Fraud_Scenarios</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="algorithm">Algorithm</Label>
              <Select>
                <SelectTrigger id="algorithm">
                  <SelectValue placeholder="Select algorithm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="random_forest">Random Forest</SelectItem>
                  <SelectItem value="neural_network">Neural Network</SelectItem>
                  <SelectItem value="gradient_boosting">Gradient Boosting</SelectItem>
                  <SelectItem value="lstm">LSTM</SelectItem>
                  <SelectItem value="graph_nn">Graph Neural Network</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="training-ratio">Training Split (%)</Label>
                <Input id="training-ratio" type="number" defaultValue="80" min="50" max="90" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hyperparameters">Hyperparameter Tuning</Label>
                <Select defaultValue="auto">
                  <SelectTrigger id="hyperparameters">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automatic</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModelOpen(false)}>Cancel</Button>
            <Button onClick={() => setCreateModelOpen(false)}>
              <Play className="h-4 w-4 mr-2" />
              Create & Train
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MlModelsPage;
