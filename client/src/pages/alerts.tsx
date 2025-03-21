import { FC, useState } from "react";
import Sidebar from "@/components/dashboard/sidebar";
import Header from "@/components/dashboard/header";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Search, Filter, MoreHorizontal, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Alert } from "@/types";
import { getRiskColor, formatDate } from "@/lib/utils";
import AlertModal from "@/components/dashboard/alert-modal";

const Alerts: FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { data: alerts, isLoading, error } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
  });
  
  const handleInvestigate = (alert: Alert) => {
    setSelectedAlert(alert);
    setIsModalOpen(true);
  };
  
  // Filter alerts based on search and filters
  const filteredAlerts = alerts?.filter(alert => {
    // Search filter
    const searchMatch = 
      searchTerm === "" ||
      alert.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Risk level filter
    const riskMatch = 
      riskFilter === "all" ||
      alert.riskLevel === riskFilter;
    
    // Status filter
    const statusMatch = 
      statusFilter === "all" ||
      alert.status === statusFilter;
    
    return searchMatch && riskMatch && statusMatch;
  });

  const getStatusIcon = (status: string) => {
    switch(status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "under investigation":
        return <Search className="h-4 w-4 text-blue-500" />;
      case "completed":
      case "resolved":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
  };

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Alerts" unreadNotifications={3} />
        
        <main className="flex-1 overflow-y-auto bg-neutral-50 p-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Alert Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-4 mb-6">
                <div className="relative flex-grow">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
                  <Input
                    type="search"
                    placeholder="Search alerts..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex flex-row gap-4">
                  <div className="w-48">
                    <Select value={riskFilter} onValueChange={setRiskFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by risk" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Risk Levels</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-48">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="under investigation">Under Investigation</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="false positive">False Positive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" className="flex items-center">
                    <Filter className="h-4 w-4 mr-2" />
                    More Filters
                  </Button>
                </div>
              </div>
              
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Alert ID</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Entity ID</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-neutral-500">
                          Loading alerts...
                        </TableCell>
                      </TableRow>
                    ) : error ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-red-500">
                          Error loading alerts
                        </TableCell>
                      </TableRow>
                    ) : filteredAlerts && filteredAlerts.length > 0 ? (
                      filteredAlerts.map((alert) => (
                        <TableRow key={alert.id}>
                          <TableCell className="font-mono">{alert.id}</TableCell>
                          <TableCell>{formatDate(alert.timestamp)}</TableCell>
                          <TableCell className="font-medium">{alert.title}</TableCell>
                          <TableCell className="font-mono">{alert.entityId}</TableCell>
                          <TableCell>
                            <Badge className={getRiskColor(alert.riskLevel)}>
                              {alert.riskLevel.charAt(0).toUpperCase() + alert.riskLevel.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {getStatusIcon(alert.status)}
                              <span className="ml-2 capitalize">
                                {alert.status.replace(/_/g, ' ')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleInvestigate(alert)}>
                                  Investigate
                                </DropdownMenuItem>
                                <DropdownMenuItem>View Details</DropdownMenuItem>
                                <DropdownMenuItem>Mark as Resolved</DropdownMenuItem>
                                <DropdownMenuItem>Flag as False Positive</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-neutral-500">
                          No alerts found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-neutral-500">
                  {filteredAlerts ? `Showing ${filteredAlerts.length} of ${alerts?.length || 0} alerts` : ""}
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious href="#" />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext href="#" />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
      
      {selectedAlert && (
        <AlertModal 
          alert={selectedAlert} 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
};

export default Alerts;
