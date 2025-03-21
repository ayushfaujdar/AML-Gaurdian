import { useQuery } from "@tanstack/react-query";
import { Alert } from "@/types";
import { useDashboard } from "@/context/dashboard-context";

export function useAlertData() {
  const { filterOptions } = useDashboard();

  // Query all alerts
  const { data: alerts, isLoading, error } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
    staleTime: 30 * 1000, // 30 seconds
  });

  // Query priority alerts specifically
  const { data: priorityAlerts, isLoading: isPriorityLoading, error: priorityError } = useQuery<Alert[]>({
    queryKey: ["/api/dashboard/priority-alerts"],
    staleTime: 30 * 1000, // 30 seconds
  });

  // Apply filters to alerts
  const filteredAlerts = alerts && filterOptions
    ? alerts.filter(alert => {
        // Filter by risk level
        if (filterOptions.riskLevel !== "all" && alert.riskLevel !== filterOptions.riskLevel) {
          return false;
        }

        // Filter by time range (simplified - in a real app would do proper date math)
        if (filterOptions.timeRange === "24h") {
          const alertDate = new Date(alert.timestamp);
          const oneDayAgo = new Date();
          oneDayAgo.setDate(oneDayAgo.getDate() - 1);
          if (alertDate < oneDayAgo) {
            return false;
          }
        } else if (filterOptions.timeRange === "7d") {
          const alertDate = new Date(alert.timestamp);
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          if (alertDate < sevenDaysAgo) {
            return false;
          }
        } else if (filterOptions.timeRange === "30d") {
          const alertDate = new Date(alert.timestamp);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          if (alertDate < thirtyDaysAgo) {
            return false;
          }
        } else if (filterOptions.timeRange === "custom" && filterOptions.customDateRange) {
          const alertDate = new Date(alert.timestamp);
          if (
            alertDate < filterOptions.customDateRange.start ||
            alertDate > filterOptions.customDateRange.end
          ) {
            return false;
          }
        }

        // Filter by transaction type (would require transaction info in the alert or a join)
        // This is simplified - in a real app we would have transaction type in the alert or join with transactions
        if (filterOptions.transactionType !== "all" && alert.transactionId) {
          // Would need transaction data to filter properly
          // For now, assume all pass this filter
        }

        return true;
      })
    : alerts;

  return {
    alerts: filteredAlerts,
    priorityAlerts,
    isLoading: isLoading || isPriorityLoading,
    error: error || priorityError,
  };
}
