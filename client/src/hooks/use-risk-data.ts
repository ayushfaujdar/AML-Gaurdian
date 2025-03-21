import { useQuery } from "@tanstack/react-query";
import { RiskHeatMapCell } from "@/types";
import { useDashboard } from "@/context/dashboard-context";

export function useRiskData() {
  const { filterOptions } = useDashboard();

  // Query risk heat map data
  const { 
    data: riskHeatMapData, 
    isLoading: riskHeatMapLoading, 
    error: riskHeatMapError 
  } = useQuery<RiskHeatMapCell[]>({
    queryKey: ["/api/dashboard/risk-heatmap", filterOptions],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query risk factor data
  const { 
    data: riskFactors, 
    isLoading: riskFactorsLoading, 
    error: riskFactorsError 
  } = useQuery<{
    jurisdictional: number;
    transactional: number;
    behavioral: number;
    entityBased: number;
  }>({
    queryKey: ["/api/risk-factors"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query risk distribution 
  const { 
    data: riskDistribution, 
    isLoading: riskDistributionLoading, 
    error: riskDistributionError 
  } = useQuery<{
    critical: number;
    high: number;
    medium: number;
    low: number;
  }>({
    queryKey: ["/api/risk-distribution"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    riskHeatMapData,
    riskFactors,
    riskDistribution,
    isLoading: riskHeatMapLoading || riskFactorsLoading || riskDistributionLoading,
    error: riskHeatMapError || riskFactorsError || riskDistributionError,
  };
}
