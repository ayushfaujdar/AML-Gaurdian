import { useQuery } from "@tanstack/react-query";
import { RiskHeatMapCell } from "@/types";
import { useDashboard } from "@/context/dashboard-context";

export function useRiskData() {
  const { filterOptions } = useDashboard();

  // Query risk heat map data
  const riskHeatMapQuery = useQuery<RiskHeatMapCell[]>({
    queryKey: ["/api/dashboard/risk-heatmap", filterOptions],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3, // Retry failed requests up to 3 times
    refetchOnWindowFocus: true,
  });

  // Query risk factor data
  const riskFactorsQuery = useQuery<{
    jurisdictional: number;
    transactional: number;
    behavioral: number;
    entityBased: number;
  }>({
    queryKey: ["/api/risk-factors"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3, // Retry failed requests up to 3 times
    refetchOnWindowFocus: true,
  });

  // Query risk distribution 
  const riskDistributionQuery = useQuery<{
    critical: number;
    high: number;
    medium: number;
    low: number;
  }>({
    queryKey: ["/api/risk-distribution"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3, // Retry failed requests up to 3 times
    refetchOnWindowFocus: true,
  });

  // Extract data, loading, and error states
  const {data: riskHeatMapData, isLoading: riskHeatMapLoading, error: riskHeatMapError, refetch: refetchHeatMap} = riskHeatMapQuery;
  const {data: riskFactors, isLoading: riskFactorsLoading, error: riskFactorsError, refetch: refetchFactors} = riskFactorsQuery;
  const {data: riskDistribution, isLoading: riskDistributionLoading, error: riskDistributionError, refetch: refetchDistribution} = riskDistributionQuery;

  // Function to refetch all data
  const refetchAll = () => {
    refetchHeatMap();
    refetchFactors();
    refetchDistribution();
  };

  return {
    riskHeatMapData,
    riskFactors,
    riskDistribution,
    isLoading: riskHeatMapLoading || riskFactorsLoading || riskDistributionLoading,
    error: riskHeatMapError || riskFactorsError || riskDistributionError,
    refetch: refetchAll,
    queries: {
      riskHeatMapQuery,
      riskFactorsQuery,
      riskDistributionQuery
    }
  };
}
