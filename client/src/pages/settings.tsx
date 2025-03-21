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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Save, Lock, Bell, Database, Key, Shield, RotateCcw, Globe } from "lucide-react";

const SettingsPage: FC = () => {
  const { toast } = useToast();
  const [isApiConnected, setIsApiConnected] = useState(true);
  
  // Notification settings form
  const notificationFormSchema = z.object({
    emailNotifications: z.boolean().default(true),
    alertThreshold: z.string(),
    dailyDigest: z.boolean().default(true),
    highRiskOnly: z.boolean().default(false)
  });
  
  const notificationForm = useForm<z.infer<typeof notificationFormSchema>>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      emailNotifications: true,
      alertThreshold: "high",
      dailyDigest: true,
      highRiskOnly: false
    }
  });
  
  // API settings form
  const apiFormSchema = z.object({
    apiKey: z.string().min(1, "API key is required"),
    apiEndpoint: z.string().url("Must be a valid URL"),
    connectionTimeout: z.string(),
    maxRetries: z.string()
  });
  
  const apiForm = useForm<z.infer<typeof apiFormSchema>>({
    resolver: zodResolver(apiFormSchema),
    defaultValues: {
      apiKey: "••••••••••••••••••••••••••••••",
      apiEndpoint: "https://api.amlguardian.com/v1",
      connectionTimeout: "30",
      maxRetries: "3"
    }
  });
  
  // Risk thresholds form
  const riskFormSchema = z.object({
    highRiskThreshold: z.string(),
    mediumRiskThreshold: z.string(),
    autoFlagThreshold: z.string(),
    jurisdictionFactorWeight: z.string(),
    transactionFactorWeight: z.string(),
    entityFactorWeight: z.string()
  });
  
  const riskForm = useForm<z.infer<typeof riskFormSchema>>({
    resolver: zodResolver(riskFormSchema),
    defaultValues: {
      highRiskThreshold: "75",
      mediumRiskThreshold: "50",
      autoFlagThreshold: "85",
      jurisdictionFactorWeight: "30",
      transactionFactorWeight: "40",
      entityFactorWeight: "30"
    }
  });
  
  const onSubmitNotifications = (data: z.infer<typeof notificationFormSchema>) => {
    toast({
      title: "Notification settings updated",
      description: "Your notification preferences have been saved."
    });
  };
  
  const onSubmitApi = (data: z.infer<typeof apiFormSchema>) => {
    toast({
      title: "API settings updated",
      description: "Your API configuration has been saved."
    });
  };
  
  const onSubmitRisk = (data: z.infer<typeof riskFormSchema>) => {
    toast({
      title: "Risk settings updated",
      description: "Your risk threshold configuration has been saved."
    });
  };
  
  const testApiConnection = () => {
    toast({
      title: "API Connection Test",
      description: "Successfully connected to the API endpoint."
    });
  };

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Settings" unreadNotifications={3} />
        
        <main className="flex-1 overflow-y-auto bg-neutral-50 p-6">
          <Tabs defaultValue="notifications" className="space-y-6">
            <TabsList className="grid w-full max-w-2xl grid-cols-4">
              <TabsTrigger value="notifications">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="api">
                <Key className="h-4 w-4 mr-2" />
                API Settings
              </TabsTrigger>
              <TabsTrigger value="risk">
                <Shield className="h-4 w-4 mr-2" />
                Risk Thresholds
              </TabsTrigger>
              <TabsTrigger value="system">
                <Database className="h-4 w-4 mr-2" />
                System
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Configure how you want to receive alerts and notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...notificationForm}>
                    <form onSubmit={notificationForm.handleSubmit(onSubmitNotifications)} className="space-y-6">
                      <FormField
                        control={notificationForm.control}
                        name="emailNotifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Email Notifications</FormLabel>
                              <FormDescription>
                                Receive alert notifications via email
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={notificationForm.control}
                        name="alertThreshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Alert Notification Threshold</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select threshold" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">All Alerts (Low+)</SelectItem>
                                <SelectItem value="medium">Medium+ Alerts</SelectItem>
                                <SelectItem value="high">High+ Alerts Only</SelectItem>
                                <SelectItem value="critical">Critical Alerts Only</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Minimum severity level for receiving notifications
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={notificationForm.control}
                        name="dailyDigest"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Daily Summary Report</FormLabel>
                              <FormDescription>
                                Receive a daily digest of all system activity
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={notificationForm.control}
                        name="highRiskOnly"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">High Risk Entity Updates Only</FormLabel>
                              <FormDescription>
                                Only notify for updates to high risk entities
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <Button type="submit">
                        <Save className="h-4 w-4 mr-2" />
                        Save Notification Settings
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="api">
              <Card>
                <CardHeader>
                  <CardTitle>API Configuration</CardTitle>
                  <CardDescription>Configure external API connections and authentication</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...apiForm}>
                    <form onSubmit={apiForm.handleSubmit(onSubmitApi)} className="space-y-6">
                      <FormField
                        control={apiForm.control}
                        name="apiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Key</FormLabel>
                            <div className="flex space-x-2">
                              <FormControl>
                                <Input type="password" {...field} />
                              </FormControl>
                              <Button variant="outline" type="button" onClick={() => {}}>
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Rotate
                              </Button>
                            </div>
                            <FormDescription>
                              API key for external data source authentication
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={apiForm.control}
                        name="apiEndpoint"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Endpoint</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormDescription>
                              Base URL for API requests
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={apiForm.control}
                          name="connectionTimeout"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Connection Timeout (seconds)</FormLabel>
                              <FormControl>
                                <Input type="number" min="1" max="120" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={apiForm.control}
                          name="maxRetries"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max Retries</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" max="10" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button type="submit">
                          <Save className="h-4 w-4 mr-2" />
                          Save API Settings
                        </Button>
                        <Button type="button" variant="outline" onClick={testApiConnection}>
                          <Globe className="h-4 w-4 mr-2" />
                          Test Connection
                        </Button>
                      </div>
                      
                      <div className={`flex items-center p-4 ${isApiConnected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'} rounded-md`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${isApiConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <p className="text-sm">
                          {isApiConnected ? 'API Connection: Active' : 'API Connection: Inactive'}
                        </p>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="risk">
              <Card>
                <CardHeader>
                  <CardTitle>Risk Scoring Configuration</CardTitle>
                  <CardDescription>Configure risk thresholds and scoring parameters</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...riskForm}>
                    <form onSubmit={riskForm.handleSubmit(onSubmitRisk)} className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium">Risk Thresholds</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={riskForm.control}
                            name="highRiskThreshold"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>High Risk Threshold</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0" max="100" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Score to classify as high risk
                                </FormDescription>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={riskForm.control}
                            name="mediumRiskThreshold"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Medium Risk Threshold</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0" max="100" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Score to classify as medium risk
                                </FormDescription>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={riskForm.control}
                            name="autoFlagThreshold"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Auto-Flag Threshold</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0" max="100" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Auto-generate alerts above this score
                                </FormDescription>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium">Risk Factor Weights</h3>
                        <p className="text-sm text-neutral-500">
                          Set the weight of each risk factor in the overall risk score calculation (must sum to 100%)
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={riskForm.control}
                            name="jurisdictionFactorWeight"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Jurisdiction Factor Weight (%)</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0" max="100" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={riskForm.control}
                            name="transactionFactorWeight"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Transaction Factor Weight (%)</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0" max="100" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={riskForm.control}
                            name="entityFactorWeight"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Entity Factor Weight (%)</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0" max="100" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      <Button type="submit">
                        <Save className="h-4 w-4 mr-2" />
                        Save Risk Settings
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="system">
              <Card>
                <CardHeader>
                  <CardTitle>System Configuration</CardTitle>
                  <CardDescription>Configure system-wide settings and maintenance options</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="data-retention">Data Retention Period (days)</Label>
                      <Input id="data-retention" type="number" min="30" defaultValue="365" />
                      <p className="text-sm text-neutral-500">
                        Number of days to retain transaction and activity data
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                      <Input id="session-timeout" type="number" min="5" defaultValue="30" />
                      <p className="text-sm text-neutral-500">
                        User session timeout due to inactivity
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Security Settings</h3>
                    
                    <div className="flex items-center justify-between border p-4 rounded-lg">
                      <div>
                        <Label className="text-base">Two-Factor Authentication</Label>
                        <p className="text-sm text-neutral-500">
                          Require 2FA for all admin accounts
                        </p>
                      </div>
                      <Switch defaultChecked={true} />
                    </div>
                    
                    <div className="flex items-center justify-between border p-4 rounded-lg">
                      <div>
                        <Label className="text-base">Enhanced Password Policy</Label>
                        <p className="text-sm text-neutral-500">
                          Require strong passwords with regular rotation
                        </p>
                      </div>
                      <Switch defaultChecked={true} />
                    </div>
                    
                    <div className="flex items-center justify-between border p-4 rounded-lg">
                      <div>
                        <Label className="text-base">IP Restriction</Label>
                        <p className="text-sm text-neutral-500">
                          Limit access to specific IP ranges
                        </p>
                      </div>
                      <Switch defaultChecked={false} />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Maintenance</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button variant="outline">
                        <Database className="h-4 w-4 mr-2" />
                        Rebuild Search Index
                      </Button>
                      
                      <Button variant="outline">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset ML Models
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button>
                    <Save className="h-4 w-4 mr-2" />
                    Save System Settings
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;
