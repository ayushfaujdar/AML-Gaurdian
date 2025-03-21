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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Label } from "@/components/ui/label";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  UserPlus, 
  Database, 
  Activity, 
  FileText, 
  Mail, 
  Shield, 
  Trash2, 
  Edit, 
  Send, 
  RefreshCw, 
  Download, 
  Search 
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";

const AdminPage: FC = () => {
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: users, isLoading, error } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });
  
  // Filter users based on search
  const filteredUsers = users?.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // User form schema
  const userFormSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Must be a valid email"),
    role: z.string(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    status: z.string()
  });
  
  const userForm = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      name: "",
      email: "",
      role: "analyst",
      password: "",
      status: "active"
    }
  });
  
  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof userFormSchema>) => {
      return apiRequest('POST', "/api/users", data);
    },
    onSuccess: () => {
      toast({
        title: "User created",
        description: "The user has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setUserDialogOpen(false);
      userForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create user: " + error,
        variant: "destructive",
      });
    }
  });
  
  const onSubmitUser = (data: z.infer<typeof userFormSchema>) => {
    createUserMutation.mutate(data);
  };
  
  const handleCreateUser = () => {
    setSelectedUser(null);
    userForm.reset({
      username: "",
      name: "",
      email: "",
      role: "analyst",
      password: "",
      status: "active"
    });
    setUserDialogOpen(true);
  };

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Administration" unreadNotifications={3} />
        
        <main className="flex-1 overflow-y-auto bg-neutral-50 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">System Administration</h1>
              <p className="text-neutral-500">Manage users, system settings, and audit logs</p>
            </div>
            <Button onClick={handleCreateUser}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
          
          <Tabs defaultValue="users" className="space-y-6">
            <TabsList className="grid w-full max-w-2xl grid-cols-4">
              <TabsTrigger value="users">
                <Users className="h-4 w-4 mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger value="audit">
                <Activity className="h-4 w-4 mr-2" />
                Audit Logs
              </TabsTrigger>
              <TabsTrigger value="backups">
                <Database className="h-4 w-4 mr-2" />
                Backups
              </TabsTrigger>
              <TabsTrigger value="reports">
                <FileText className="h-4 w-4 mr-2" />
                System Reports
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    Add, edit and manage user accounts and permissions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative mb-6">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
                    <Input
                      type="search"
                      placeholder="Search users..."
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-6 text-neutral-500">
                              Loading users...
                            </TableCell>
                          </TableRow>
                        ) : error ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-6 text-red-500">
                              Error loading users
                            </TableCell>
                          </TableRow>
                        ) : filteredUsers && filteredUsers.length > 0 ? (
                          filteredUsers.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">{user.name}</TableCell>
                              <TableCell>{user.username}</TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    user.role === "admin"
                                      ? "bg-purple-100 text-purple-800"
                                      : user.role === "investigator"
                                      ? "bg-blue-100 text-blue-800"
                                      : user.role === "compliance_officer"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-neutral-100 text-neutral-800"
                                  }
                                >
                                  {user.role.charAt(0).toUpperCase() + user.role.slice(1).replace(/_/g, ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    user.status === "active"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }
                                >
                                  {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Mail className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Shield className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-6 text-neutral-500">
                              No users found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Role Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-32 bg-neutral-50 rounded-md flex items-center justify-center">
                      <p className="text-neutral-500">Role distribution chart</p>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                          <span className="text-sm">Admin</span>
                        </div>
                        <span className="text-sm font-medium">
                          {users?.filter(u => u.role === "admin").length || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                          <span className="text-sm">Investigator</span>
                        </div>
                        <span className="text-sm font-medium">
                          {users?.filter(u => u.role === "investigator").length || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                          <span className="text-sm">Compliance Officer</span>
                        </div>
                        <span className="text-sm font-medium">
                          {users?.filter(u => u.role === "compliance_officer").length || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-neutral-500 rounded-full mr-2"></div>
                          <span className="text-sm">Analyst</span>
                        </div>
                        <span className="text-sm font-medium">
                          {users?.filter(u => u.role === "analyst").length || 0}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">User Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-32 bg-neutral-50 rounded-md flex items-center justify-center">
                      <p className="text-neutral-500">Activity timeline chart</p>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-600">Active today</span>
                        <span className="text-sm font-medium">12</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-600">Active this week</span>
                        <span className="text-sm font-medium">18</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-600">Inactive ({'>'}30 days)</span>
                        <span className="text-sm font-medium">3</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">System Access</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-3 bg-neutral-50 rounded-md">
                        <p className="text-sm font-medium text-neutral-700">Failed Login Attempts</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xl font-bold text-red-600">17</p>
                          <Badge className="bg-red-100 text-red-800">Last 24h</Badge>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-neutral-50 rounded-md">
                        <p className="text-sm font-medium text-neutral-700">Password Resets</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xl font-bold text-blue-600">4</p>
                          <Badge className="bg-blue-100 text-blue-800">Last 7d</Badge>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-neutral-50 rounded-md">
                        <p className="text-sm font-medium text-neutral-700">Locked Accounts</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xl font-bold text-orange-600">2</p>
                          <Button variant="outline" size="sm" className="h-7 text-xs">Manage</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="audit">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle>Audit Logs</CardTitle>
                    <CardDescription>
                      System activity logs for compliance and security monitoring
                    </CardDescription>
                  </div>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Logs
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Resource</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>2023-06-15 14:32:45</TableCell>
                          <TableCell>admin</TableCell>
                          <TableCell>User Creation</TableCell>
                          <TableCell>192.168.1.45</TableCell>
                          <TableCell>/api/users</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800">Success</Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">View</Button>
                          </TableCell>
                        </TableRow>
                        
                        <TableRow>
                          <TableCell>2023-06-15 13:45:12</TableCell>
                          <TableCell>jsmith</TableCell>
                          <TableCell>Alert Update</TableCell>
                          <TableCell>192.168.1.22</TableCell>
                          <TableCell>/api/alerts/ALT-45982</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800">Success</Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">View</Button>
                          </TableCell>
                        </TableRow>
                        
                        <TableRow>
                          <TableCell>2023-06-15 11:23:07</TableCell>
                          <TableCell>admin</TableCell>
                          <TableCell>API Key Rotation</TableCell>
                          <TableCell>192.168.1.45</TableCell>
                          <TableCell>/api/settings/api-keys</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800">Success</Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">View</Button>
                          </TableCell>
                        </TableRow>
                        
                        <TableRow>
                          <TableCell>2023-06-15 10:12:35</TableCell>
                          <TableCell>mwilliams</TableCell>
                          <TableCell>Login Attempt</TableCell>
                          <TableCell>192.168.1.78</TableCell>
                          <TableCell>/api/auth/login</TableCell>
                          <TableCell>
                            <Badge className="bg-red-100 text-red-800">Failed</Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">View</Button>
                          </TableCell>
                        </TableRow>
                        
                        <TableRow>
                          <TableCell>2023-06-15 09:48:22</TableCell>
                          <TableCell>mwilliams</TableCell>
                          <TableCell>Login</TableCell>
                          <TableCell>192.168.1.78</TableCell>
                          <TableCell>/api/auth/login</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800">Success</Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">View</Button>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="text-sm text-neutral-500">
                    Showing 5 of 2,453 log entries
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" disabled>Previous</Button>
                    <Button variant="outline" size="sm">Next</Button>
                  </div>
                </CardFooter>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Security Alerts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center p-3 bg-red-50 border border-red-100 rounded-md">
                        <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
                        <div>
                          <p className="font-medium text-red-800">Multiple Failed Login Attempts</p>
                          <p className="text-sm text-red-600">User: jdoe, 5 attempts, 10 minutes ago</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center p-3 bg-yellow-50 border border-yellow-100 rounded-md">
                        <AlertTriangle className="h-5 w-5 text-yellow-500 mr-3" />
                        <div>
                          <p className="font-medium text-yellow-800">Unusual Access Pattern</p>
                          <p className="text-sm text-yellow-600">User: analyst2, Accessing high-risk cases, 1 hour ago</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center p-3 bg-orange-50 border border-orange-100 rounded-md">
                        <AlertTriangle className="h-5 w-5 text-orange-500 mr-3" />
                        <div>
                          <p className="font-medium text-orange-800">Permission Change</p>
                          <p className="text-sm text-orange-600">User privileges escalated for user: msmith, 3 hours ago</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Recent System Changes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="mt-0.5">
                          <Database className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-medium">Database Schema Update</p>
                          <p className="text-sm text-neutral-600">Added new fields to transaction table</p>
                          <p className="text-xs text-neutral-500">Today, 09:14 AM - admin</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3">
                        <div className="mt-0.5">
                          <Brain className="h-5 w-5 text-purple-500" />
                        </div>
                        <div>
                          <p className="font-medium">ML Model Deployment</p>
                          <p className="text-sm text-neutral-600">New transaction pattern recognition model v2.3</p>
                          <p className="text-xs text-neutral-500">Yesterday, 03:22 PM - admin</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3">
                        <div className="mt-0.5">
                          <Shield className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                          <p className="font-medium">Security Policy Update</p>
                          <p className="text-sm text-neutral-600">Enhanced password requirements implemented</p>
                          <p className="text-xs text-neutral-500">June 14, 2023, 10:45 AM - admin</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3">
                        <div className="mt-0.5">
                          <Activity className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-medium">Monitoring Configuration</p>
                          <p className="text-sm text-neutral-600">Updated alert thresholds for transaction monitoring</p>
                          <p className="text-xs text-neutral-500">June 12, 2023, 02:15 PM - admin</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="backups">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle>System Backups</CardTitle>
                    <CardDescription>
                      Manage database backups and system snapshots
                    </CardDescription>
                  </div>
                  <div className="space-x-2">
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Create Backup
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Backup ID</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Created At</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Retention</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-mono">BKP-20230615-FULL</TableCell>
                          <TableCell>Full System</TableCell>
                          <TableCell>2023-06-15 00:00:12</TableCell>
                          <TableCell>12.4 GB</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800">Complete</Badge>
                          </TableCell>
                          <TableCell>30 days</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" size="sm">Download</Button>
                              <Button variant="outline" size="sm">Restore</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        <TableRow>
                          <TableCell className="font-mono">BKP-20230614-FULL</TableCell>
                          <TableCell>Full System</TableCell>
                          <TableCell>2023-06-14 00:00:09</TableCell>
                          <TableCell>12.2 GB</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800">Complete</Badge>
                          </TableCell>
                          <TableCell>30 days</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" size="sm">Download</Button>
                              <Button variant="outline" size="sm">Restore</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        <TableRow>
                          <TableCell className="font-mono">BKP-20230613-FULL</TableCell>
                          <TableCell>Full System</TableCell>
                          <TableCell>2023-06-13 00:00:15</TableCell>
                          <TableCell>12.0 GB</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800">Complete</Badge>
                          </TableCell>
                          <TableCell>30 days</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" size="sm">Download</Button>
                              <Button variant="outline" size="sm">Restore</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        <TableRow>
                          <TableCell className="font-mono">BKP-20230612-FULL</TableCell>
                          <TableCell>Full System</TableCell>
                          <TableCell>2023-06-12 00:00:08</TableCell>
                          <TableCell>11.8 GB</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800">Complete</Badge>
                          </TableCell>
                          <TableCell>30 days</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" size="sm">Download</Button>
                              <Button variant="outline" size="sm">Restore</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Backup Schedule</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <p className="font-medium">Full System Backup</p>
                          <p className="text-sm text-neutral-600">Daily at 00:00 UTC</p>
                        </div>
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <p className="font-medium">Transaction Data</p>
                          <p className="text-sm text-neutral-600">Every 6 hours</p>
                        </div>
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <p className="font-medium">User Activity Logs</p>
                          <p className="text-sm text-neutral-600">Every 12 hours</p>
                        </div>
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <p className="font-medium">Configuration Backup</p>
                          <p className="text-sm text-neutral-600">Weekly on Sunday</p>
                        </div>
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Backup Storage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div>
                        <div className="flex justify-between mb-2">
                          <p className="text-sm font-medium">Primary Storage</p>
                          <p className="text-sm text-neutral-600">36.4 GB / 100 GB</p>
                        </div>
                        <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: "36.4%" }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-2">
                          <p className="text-sm font-medium">Secondary Storage</p>
                          <p className="text-sm text-neutral-600">36.4 GB / 200 GB</p>
                        </div>
                        <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: "18.2%" }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-2">
                          <p className="text-sm font-medium">Archive Storage</p>
                          <p className="text-sm text-neutral-600">182.7 GB / 500 GB</p>
                        </div>
                        <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: "36.5%" }}></div>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-md">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <Database className="h-5 w-5 text-blue-500 mr-2" />
                            <p className="font-medium text-blue-800">Next Scheduled Backup</p>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800">
                            {new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleDateString()} 00:00 UTC
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="reports">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle>System Reports</CardTitle>
                    <CardDescription>
                      Generate and access system-wide reports
                    </CardDescription>
                  </div>
                  <Button>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Report Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Generated</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead>Format</TableHead>
                          <TableHead>Generated By</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">System Health Report</TableCell>
                          <TableCell>System</TableCell>
                          <TableCell>2023-06-15</TableCell>
                          <TableCell>June 2023</TableCell>
                          <TableCell>PDF</TableCell>
                          <TableCell>admin</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm">Download</Button>
                          </TableCell>
                        </TableRow>
                        
                        <TableRow>
                          <TableCell className="font-medium">User Activity Summary</TableCell>
                          <TableCell>Activity</TableCell>
                          <TableCell>2023-06-15</TableCell>
                          <TableCell>Last 30 Days</TableCell>
                          <TableCell>PDF</TableCell>
                          <TableCell>admin</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm">Download</Button>
                          </TableCell>
                        </TableRow>
                        
                        <TableRow>
                          <TableCell className="font-medium">AML Alert Statistics</TableCell>
                          <TableCell>Compliance</TableCell>
                          <TableCell>2023-06-14</TableCell>
                          <TableCell>May 2023</TableCell>
                          <TableCell>XLSX</TableCell>
                          <TableCell>admin</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm">Download</Button>
                          </TableCell>
                        </TableRow>
                        
                        <TableRow>
                          <TableCell className="font-medium">Model Performance Report</TableCell>
                          <TableCell>ML</TableCell>
                          <TableCell>2023-06-14</TableCell>
                          <TableCell>Q2 2023</TableCell>
                          <TableCell>PDF</TableCell>
                          <TableCell>admin</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm">Download</Button>
                          </TableCell>
                        </TableRow>
                        
                        <TableRow>
                          <TableCell className="font-medium">SAR Filing Summary</TableCell>
                          <TableCell>Compliance</TableCell>
                          <TableCell>2023-06-10</TableCell>
                          <TableCell>May 2023</TableCell>
                          <TableCell>PDF</TableCell>
                          <TableCell>admin</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm">Download</Button>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">System Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <p className="text-sm">CPU Usage</p>
                        <p className="text-sm font-medium">24%</p>
                      </div>
                      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: "24%" }}></div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <p className="text-sm">Memory Usage</p>
                        <p className="text-sm font-medium">42%</p>
                      </div>
                      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: "42%" }}></div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <p className="text-sm">Disk Usage</p>
                        <p className="text-sm font-medium">67%</p>
                      </div>
                      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: "67%" }}></div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <p className="text-sm">Network I/O</p>
                        <p className="text-sm font-medium">18%</p>
                      </div>
                      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: "18%" }}></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Alert Processing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-md">
                      <p className="text-sm font-medium">Average Processing Time</p>
                      <p className="text-lg font-bold text-blue-600">267ms</p>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-md">
                      <p className="text-sm font-medium">Alerts Processed (24h)</p>
                      <p className="text-lg font-bold text-blue-600">1,243</p>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-md">
                      <p className="text-sm font-medium">Queue Length</p>
                      <p className="text-lg font-bold text-green-600">0</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">System Uptime</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-md">
                      <div>
                        <p className="text-sm font-medium text-green-800">Current Uptime</p>
                        <p className="text-xs text-green-600">Since last restart</p>
                      </div>
                      <p className="text-lg font-bold text-green-700">32 days, 7 hours</p>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-md">
                      <p className="text-sm font-medium">Availability (30d)</p>
                      <p className="text-lg font-bold text-blue-600">99.998%</p>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-md">
                      <p className="text-sm font-medium">Last Restart</p>
                      <p className="text-sm font-medium">May 14, 2023 08:23 UTC</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
      
      {/* User Form Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? `Edit User: ${selectedUser.name}` : "Create New User"}
            </DialogTitle>
            <DialogDescription>
              {selectedUser ? "Update user information and permissions" : "Add a new user to the system"}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...userForm}>
            <form onSubmit={userForm.handleSubmit(onSubmitUser)} className="space-y-4 py-2">
              <FormField
                control={userForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={userForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={userForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={userForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="investigator">Investigator</SelectItem>
                        <SelectItem value="compliance_officer">Compliance Officer</SelectItem>
                        <SelectItem value="analyst">Analyst</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={userForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter password" {...field} />
                    </FormControl>
                    <FormDescription>
                      Must be at least 6 characters and include numbers.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={userForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="mt-6">
                <Button variant="outline" type="button" onClick={() => setUserDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? "Creating..." : selectedUser ? "Update User" : "Create User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPage;
