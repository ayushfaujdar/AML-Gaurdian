import { useQuery } from "@tanstack/react-query";
import { Transaction, DetectedPattern } from "@/types";
import { useDashboard } from "@/context/dashboard-context";

export function useTransactionData() {
  const { filterOptions } = useDashboard();

  // Query all transactions
  const { data: transactions, isLoading: transactionsLoading, error: transactionsError } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    staleTime: 60 * 1000, // 1 minute
  });

  // Query transaction patterns
  const { data: patterns, isLoading: patternsLoading, error: patternsError } = useQuery<DetectedPattern[]>({
    queryKey: ["/api/transaction-patterns"],
    staleTime: 60 * 1000, // 1 minute
  });

  // Generate or retrieve time series data for visualization
  // In a real application, this would come from the API
  const timeSeriesData = [0.25, 0.4, 0.35, 0.5, 0.25, 0.6, 0.85, 0.75, 0.5, 0.4, 0.25, 0.3, 0.4, 0.6, 0.8, 0.5, 0.4, 0.25, 0.3, 0.4];

  // Apply filters to transactions
  const filteredTransactions = transactions && filterOptions
    ? transactions.filter(transaction => {
        // Filter by risk level
        if (filterOptions.riskLevel !== "all" && transaction.riskLevel !== filterOptions.riskLevel) {
          return false;
        }

        // Filter by time range
        if (filterOptions.timeRange === "24h") {
          const txDate = new Date(transaction.timestamp);
          const oneDayAgo = new Date();
          oneDayAgo.setDate(oneDayAgo.getDate() - 1);
          if (txDate < oneDayAgo) {
            return false;
          }
        } else if (filterOptions.timeRange === "7d") {
          const txDate = new Date(transaction.timestamp);
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          if (txDate < sevenDaysAgo) {
            return false;
          }
        } else if (filterOptions.timeRange === "30d") {
          const txDate = new Date(transaction.timestamp);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          if (txDate < thirtyDaysAgo) {
            return false;
          }
        } else if (filterOptions.timeRange === "custom" && filterOptions.customDateRange) {
          const txDate = new Date(transaction.timestamp);
          if (
            txDate < filterOptions.customDateRange.start ||
            txDate > filterOptions.customDateRange.end
          ) {
            return false;
          }
        }

        // Filter by transaction type
        if (filterOptions.transactionType !== "all" && transaction.category !== filterOptions.transactionType) {
          return false;
        }

        return true;
      })
    : transactions;

  return {
    transactions: filteredTransactions,
    transactionPatterns: patterns,
    timeSeriesData,
    isLoading: transactionsLoading || patternsLoading,
    error: transactionsError || patternsError,
  };
}
