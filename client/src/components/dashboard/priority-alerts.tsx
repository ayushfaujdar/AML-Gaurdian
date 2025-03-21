import { FC, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BadgeAlert, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { useAlertData } from "@/hooks/use-alert-data";
import { Alert } from "@/types";
import AlertModal from "./alert-modal";

interface PriorityAlertsProps {
  className?: string;
}

const PriorityAlerts: FC<PriorityAlertsProps> = ({ className }) => {
  const { priorityAlerts, isLoading, error } = useAlertData();
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleInvestigate = (alert: Alert) => {
    setSelectedAlert(alert);
    setIsModalOpen(true);
  };

  return (
    <>
      <Card className={className}>
        <CardHeader className="px-6 py-4 border-b border-neutral-200 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium text-neutral-800">Priority Alerts</CardTitle>
          <Button variant="link" className="text-primary hover:text-primary/90 p-0 h-auto">View All</Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-neutral-100">
            {isLoading ? (
              <div className="p-4 text-center text-neutral-500">Loading alerts...</div>
            ) : error ? (
              <div className="p-4 text-center text-red-500">Error loading alerts</div>
            ) : priorityAlerts && priorityAlerts.length > 0 ? (
              priorityAlerts.map((alert: Alert, index: number) => {
                // Calculate how long ago the alert was created
                const alertTime = new Date(alert.timestamp);
                const now = new Date();
                const hoursAgo = Math.floor((now.getTime() - alertTime.getTime()) / (1000 * 60 * 60));
                const timeAgo = hoursAgo < 24 
                  ? `${hoursAgo}h ago` 
                  : `${Math.floor(hoursAgo / 24)}d ago`;
                
                // Determine badge color based on risk level
                const getBadgeClass = () => {
                  switch (alert.riskLevel) {
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
                
                // Icon color based on risk level
                const getIconColor = () => {
                  return alert.riskLevel === "critical" || alert.riskLevel === "high" 
                    ? "bg-red-100" 
                    : "bg-orange-100";
                };
                
                const getIcon = () => {
                  return alert.riskLevel === "critical" || alert.riskLevel === "high" 
                    ? <AlertCircle className="text-status-critical text-sm" /> 
                    : <BadgeAlert className="text-status-warning text-sm" />;
                };

                return (
                  <div key={index} className="p-4 hover:bg-neutral-50">
                    <div className="flex items-start">
                      <div className={cn("p-1 rounded-full mr-3", getIconColor())}>
                        {getIcon()}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <h4 className="text-sm font-medium text-neutral-800">{alert.title}</h4>
                          <span className="text-xs text-neutral-500">{timeAgo}</span>
                        </div>
                        <p className="text-sm text-neutral-600 mt-1">{alert.description}</p>
                        <div className="mt-2 flex justify-between items-center">
                          <Badge className={cn("px-2 py-0.5 rounded-full text-xs", getBadgeClass())}>
                            Risk Score: {alert.riskScore}
                          </Badge>
                          <Button 
                            variant="link" 
                            className="text-xs text-primary hover:text-primary/90 p-0 h-auto"
                            onClick={() => handleInvestigate(alert)}
                          >
                            Investigate
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-neutral-500">No alerts found</div>
            )}
          </div>
        </CardContent>
        <CardFooter className="p-4 text-center border-t border-neutral-100">
          <Button variant="link" className="text-primary hover:text-primary/90 w-full p-0 h-auto">
            Load More Alerts
          </Button>
        </CardFooter>
      </Card>

      {selectedAlert && (
        <AlertModal 
          alert={selectedAlert} 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </>
  );
};

export default PriorityAlerts;
