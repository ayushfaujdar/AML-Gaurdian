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
import { Search, FileText, MoreHorizontal, Download, Eye, Send } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Report } from "@/types";
import { formatDate } from "@/lib/utils";

const ReportsPage: FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  
  const { data: reports, isLoading, error } = useQuery<Report[]>({
    queryKey: ["/api/reports"],
  });
  
  // Filter reports based on search and type filter
  const filteredReports = reports?.filter(report => {
    // Search filter
    const searchMatch = 
      searchTerm === "" ||
      report.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.caseId.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Type filter
    const typeMatch = 
      typeFilter === "all" ||
      report.type === typeFilter;
    
    return searchMatch && typeMatch;
  });
  
  // Sort by creation date (newest first)
  const sortedReports = filteredReports ? 
    [...filteredReports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : 
    [];
  
  const getStatusColor = (status: string) => {
    switch(status) {
      case "draft":
        return "bg-neutral-100 text-neutral-800";
      case "submitted":
        return "bg-blue-100 text-blue-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-neutral-100 text-neutral-800";
    }
  };
  
  const getTypeColor = (type: string) => {
    switch(type) {
      case "sar":
        return "bg-red-100 text-red-800";
      case "ctr":
        return "bg-blue-100 text-blue-800";
      case "aml":
        return "bg-purple-100 text-purple-800";
      case "kyc":
        return "bg-green-100 text-green-800";
      default:
        return "bg-neutral-100 text-neutral-800";
    }
  };

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Regulatory Reports" unreadNotifications={3} />
        
        <main className="flex-1 overflow-y-auto bg-neutral-50 p-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Report Management</CardTitle>
                <CardDescription>Manage regulatory reports such as SARs, CTRs, and other AML filings</CardDescription>
              </div>
              <Button>
                <FileText className="h-4 w-4 mr-2" />
                Create New Report
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
                  <Input
                    type="search"
                    placeholder="Search reports..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="w-full md:w-48">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="sar">SAR</SelectItem>
                      <SelectItem value="ctr">CTR</SelectItem>
                      <SelectItem value="aml">AML</SelectItem>
                      <SelectItem value="kyc">KYC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Case ID</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead>Submitted Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6 text-neutral-500">
                          Loading reports...
                        </TableCell>
                      </TableRow>
                    ) : error ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6 text-red-500">
                          Error loading reports
                        </TableCell>
                      </TableRow>
                    ) : sortedReports.length > 0 ? (
                      sortedReports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-mono">{report.id}</TableCell>
                          <TableCell className="font-medium">{report.title}</TableCell>
                          <TableCell>
                            <Badge className={getTypeColor(report.type)}>
                              {report.type.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">{report.caseId}</TableCell>
                          <TableCell>{formatDate(report.createdAt)}</TableCell>
                          <TableCell>{report.submittedAt ? formatDate(report.submittedAt) : "Not submitted"}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(report.status)}>
                              {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Send className="h-4 w-4 mr-2" />
                                  Submit
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6 text-neutral-500">
                          No reports found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Regulatory Reporting Guidelines</CardTitle>
              <CardDescription>Essential information for AML compliance reporting</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">Suspicious Activity Report (SAR)</h3>
                  <ul className="space-y-2 text-sm text-neutral-600">
                    <li>• Required for suspicious transactions that might indicate money laundering</li>
                    <li>• Must be filed within 30 days of detection</li>
                    <li>• Contains detailed information about suspicious activity</li>
                    <li>• Subject to confidentiality requirements</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-3">Currency Transaction Report (CTR)</h3>
                  <ul className="space-y-2 text-sm text-neutral-600">
                    <li>• Required for cash transactions exceeding $10,000</li>
                    <li>• Must be filed within 15 days of the transaction</li>
                    <li>• Requires identification information for involved parties</li>
                    <li>• Exemptions available for certain customers</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-3">Report Filing Process</h3>
                  <ol className="space-y-2 text-sm text-neutral-600 list-decimal pl-4">
                    <li>Create draft report from case investigation findings</li>
                    <li>Internal review and approval by compliance officer</li>
                    <li>Submit to appropriate regulatory authority</li>
                    <li>Track status and respond to any follow-up inquiries</li>
                    <li>Document all reporting actions for audit purposes</li>
                  </ol>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-3">Regulatory Requirements</h3>
                  <div className="space-y-2 text-sm text-neutral-600">
                    <p>Reports must contain accurate and detailed information about the parties involved, transaction details, and the nature of suspicious activity. All reports are subject to regulatory review and may be used in law enforcement investigations.</p>
                    <p>Failure to file required reports can result in significant penalties and regulatory actions against the financial institution.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default ReportsPage;
