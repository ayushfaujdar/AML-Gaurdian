import { FC, useState } from "react";
import Sidebar from "@/components/dashboard/sidebar";
import Header from "@/components/dashboard/header";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
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
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Search, MoreHorizontal, Plus, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Case } from "@/types";
import { formatDate } from "@/lib/utils";

const CasesPage: FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: cases, isLoading, error } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });
  
  // Filter cases based on search
  const filteredCases = cases?.filter(caseItem => 
    caseItem.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    caseItem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    caseItem.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Sort by created date (newest first)
  const sortedCases = filteredCases ? 
    [...filteredCases].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : 
    [];
  
  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };
  
  const getStatusColor = (status: string) => {
    switch(status) {
      case "in progress":
        return "bg-blue-100 text-blue-800";
      case "completed":
      case "resolved":
        return "bg-green-100 text-green-800";
      case "needs review":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-neutral-100 text-neutral-800";
    }
  };

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Cases" unreadNotifications={3} />
        
        <main className="flex-1 overflow-y-auto bg-neutral-50 p-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Case Management</CardTitle>
                <CardDescription>View and manage AML investigation cases</CardDescription>
              </div>
              <Button size="sm" className="h-9">
                <Plus className="h-4 w-4 mr-2" />
                New Case
              </Button>
            </CardHeader>
            <CardContent>
              <div className="relative mb-6">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
                <Input
                  type="search"
                  placeholder="Search cases..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Case ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-neutral-500">
                          Loading cases...
                        </TableCell>
                      </TableRow>
                    ) : error ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-red-500">
                          Error loading cases
                        </TableCell>
                      </TableRow>
                    ) : sortedCases.length > 0 ? (
                      sortedCases.map((caseItem) => (
                        <TableRow key={caseItem.id}>
                          <TableCell className="font-mono">{caseItem.id}</TableCell>
                          <TableCell className="font-medium">{caseItem.title}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(caseItem.status)}>
                              {caseItem.status.charAt(0).toUpperCase() + caseItem.status.slice(1).replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPriorityColor(caseItem.priority)}>
                              {caseItem.priority.charAt(0).toUpperCase() + caseItem.priority.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(caseItem.createdAt)}</TableCell>
                          <TableCell>{caseItem.assignedTo || "Unassigned"}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>View Details</DropdownMenuItem>
                                <DropdownMenuItem>Assign Case</DropdownMenuItem>
                                <DropdownMenuItem>Update Status</DropdownMenuItem>
                                <DropdownMenuItem>Create Report</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-neutral-500">
                          No cases found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-neutral-500">
                  {filteredCases ? `Showing ${filteredCases.length} of ${cases?.length || 0} cases` : ""}
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
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="border rounded-lg p-4 relative">
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-green-100 text-green-800">Submitted</Badge>
                    </div>
                    <div className="pt-6">
                      <FileText className="h-10 w-10 text-neutral-400 mb-2" />
                      <h3 className="font-medium">SAR Report #{item}</h3>
                      <p className="text-sm text-neutral-500 mt-1">Filed on {new Date().toLocaleDateString()}</p>
                      <Button variant="outline" size="sm" className="mt-3">
                        View Report
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default CasesPage;
