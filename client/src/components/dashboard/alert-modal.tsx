import { FC, useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, TransactionTimelineEvent } from "@/types";
import { formatDate } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AlertModalProps {
  alert: Alert;
  isOpen: boolean;
  onClose: () => void;
}

const AlertModal: FC<AlertModalProps> = ({ 
  alert, 
  isOpen, 
  onClose 
}) => {
  const [notes, setNotes] = useState("");
  const [riskAssessment, setRiskAssessment] = useState("high");
  const [assignee, setAssignee] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch entity information
  const { data: entity, isLoading: entityLoading } = useQuery({
    queryKey: [`/api/entities/${alert.entityId}`],
    enabled: isOpen,
  });
  
  // Fetch transaction timeline if there's a transaction ID
  const { data: timeline, isLoading: timelineLoading } = useQuery<TransactionTimelineEvent[]>({
    queryKey: [alert.transactionId ? `/api/transactions/${alert.transactionId}/timeline` : null],
    enabled: isOpen && !!alert.transactionId,
  });
  
  // Fetch users for assignee dropdown
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    enabled: isOpen,
  });
  
  // Update alert handler
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('PATCH', `/api/alerts/${alert.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Alert updated",
        description: "The alert has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/priority-alerts"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update alert: " + error,
        variant: "destructive",
      });
    }
  });
  
  // File SAR report handler
  const sarMutation = useMutation({
    mutationFn: async () => {
      const reportData = {
        caseId: "Case-" + Date.now(), // In a real app, we'd create a case first
        type: "sar",
        title: `SAR Report for ${alert.id}`,
        description: `Suspicious activity detected: ${alert.description}\n\nInvestigator notes: ${notes}`,
        status: "draft",
        createdBy: "1", // Current user ID
      };
      return apiRequest('POST', "/api/reports", reportData);
    },
    onSuccess: () => {
      toast({
        title: "SAR Report Created",
        description: "A new SAR report has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create SAR report: " + error,
        variant: "destructive",
      });
    }
  });
  
  const handleSaveInvestigation = () => {
    updateMutation.mutate({
      status: "under investigation",
      assignedTo: assignee || undefined,
    });
  };
  
  const handleFileSAR = () => {
    sarMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Alert Investigation: {alert.title}</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="text-sm font-medium text-neutral-500 mb-2">Alert Details</h4>
              <div className="bg-neutral-50 p-4 rounded">
                <div className="mb-3">
                  <span className="text-xs text-neutral-500">Alert ID</span>
                  <p className="text-sm font-mono">{alert.id}</p>
                </div>
                <div className="mb-3">
                  <span className="text-xs text-neutral-500">Generated</span>
                  <p className="text-sm">{formatDate(alert.timestamp)}</p>
                </div>
                <div className="mb-3">
                  <span className="text-xs text-neutral-500">Risk Score</span>
                  <p className="text-sm">
                    <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full">
                      {alert.riskScore} - {alert.riskLevel.charAt(0).toUpperCase() + alert.riskLevel.slice(1)}
                    </span>
                  </p>
                </div>
                <div className="mb-3">
                  <span className="text-xs text-neutral-500">Status</span>
                  <p className="text-sm">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                      {alert.status.charAt(0).toUpperCase() + alert.status.slice(1).replace(/_/g, ' ')}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-xs text-neutral-500">Detection Method</span>
                  <p className="text-sm">{alert.detectionMethod}</p>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-neutral-500 mb-2">Entity Information</h4>
              <div className="bg-neutral-50 p-4 rounded">
                {entityLoading ? (
                  <p className="text-sm text-neutral-500">Loading entity data...</p>
                ) : entity ? (
                  <>
                    <div className="mb-3">
                      <span className="text-xs text-neutral-500">Entity ID</span>
                      <p className="text-sm font-mono">{entity.id}</p>
                    </div>
                    <div className="mb-3">
                      <span className="text-xs text-neutral-500">Entity Type</span>
                      <p className="text-sm">{entity.type.charAt(0).toUpperCase() + entity.type.slice(1).replace(/_/g, ' ')}</p>
                    </div>
                    <div className="mb-3">
                      <span className="text-xs text-neutral-500">Jurisdiction</span>
                      <p className="text-sm">{entity.jurisdiction}</p>
                    </div>
                    <div className="mb-3">
                      <span className="text-xs text-neutral-500">Registration Date</span>
                      <p className="text-sm">{formatDate(entity.registrationDate)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-neutral-500">Entity Risk</span>
                      <p className="text-sm">
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full">
                          {entity.riskLevel.charAt(0).toUpperCase() + entity.riskLevel.slice(1)}
                        </span>
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-neutral-500">Entity information not available</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <h4 className="text-sm font-medium text-neutral-500 mb-2">Alert Description</h4>
            <div className="bg-neutral-50 p-4 rounded">
              <p className="text-sm text-neutral-700">
                {alert.description}
              </p>
            </div>
          </div>
          
          {alert.transactionId && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-neutral-500 mb-2">Transaction Timeline</h4>
              <div className="relative pl-8 pb-2">
                <div className="absolute top-0 left-3 bottom-0 w-0.5 bg-neutral-200"></div>
                
                {timelineLoading ? (
                  <p className="text-sm text-neutral-500">Loading transaction timeline...</p>
                ) : timeline && timeline.length > 0 ? (
                  timeline.map((event, index) => (
                    <div key={index} className="mb-6 relative">
                      <div className="absolute top-1 left-[-24px] w-4 h-4 rounded-full bg-primary border-2 border-white"></div>
                      <div className="flex items-start">
                        <div>
                          <p className="text-sm font-medium text-neutral-800">
                            {event.direction === "incoming" ? "Incoming" : "Outgoing"} {event.amount} {event.currency}
                          </p>
                          <p className="text-xs text-neutral-500">{formatDate(event.timestamp)}</p>
                          <p className="text-sm text-neutral-600 mt-1">
                            {event.direction === "incoming" ? "Received from" : "Sent to"} Entity {event.entityId}
                          </p>
                          {event.isFlagged && (
                            <div className="mt-2 px-2 py-1 bg-red-50 border border-red-100 rounded text-xs text-red-700">
                              Flagged: {event.flagReason}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-neutral-500">No transaction timeline available</p>
                )}
              </div>
            </div>
          )}
          
          <div>
            <h4 className="text-sm font-medium text-neutral-500 mb-2">Investigation Actions</h4>
            <div className="bg-neutral-50 p-4 rounded space-y-4">
              <div>
                <Label htmlFor="notes" className="block text-sm font-medium text-neutral-700 mb-1">Investigation Notes</Label>
                <Textarea 
                  id="notes"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                  rows={4}
                  placeholder="Enter investigation notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="risk" className="block text-sm font-medium text-neutral-700 mb-1">Risk Assessment</Label>
                <Select value={riskAssessment} onValueChange={setRiskAssessment}>
                  <SelectTrigger id="risk" className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm">
                    <SelectValue placeholder="Select risk assessment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical Risk - Require Immediate SAR Filing</SelectItem>
                    <SelectItem value="high">High Risk - Further Investigation Needed</SelectItem>
                    <SelectItem value="medium">Medium Risk - Enhanced Monitoring</SelectItem>
                    <SelectItem value="low">Low Risk - False Positive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="assignee" className="block text-sm font-medium text-neutral-700 mb-1">Assign To</Label>
                <Select value={assignee} onValueChange={setAssignee}>
                  <SelectTrigger id="assignee" className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm">
                    <SelectValue placeholder="Select Team Member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Select Team Member</SelectItem>
                    {!usersLoading && users && users.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} - {user.role.charAt(0).toUpperCase() + user.role.slice(1).replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="px-6 py-4 border-t border-neutral-200">
          <Button variant="outline" onClick={onClose} className="mr-auto">
            Cancel
          </Button>
          <Button 
            variant="default" 
            className="bg-primary text-white rounded-md hover:bg-primary/90"
            onClick={handleSaveInvestigation}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Saving..." : "Save & Continue Investigation"}
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleFileSAR}
            disabled={sarMutation.isPending}
          >
            {sarMutation.isPending ? "Filing..." : "File SAR Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AlertModal;
