import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { FilterOptions } from "@/types";

interface DashboardContextType {
  filterOptions: FilterOptions;
  updateFilterOptions: (options: Partial<FilterOptions>) => void;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    timeRange: "24h",
    riskLevel: "all",
    transactionType: "all",
  });

  // Update filter options
  const updateFilterOptions = (options: Partial<FilterOptions>) => {
    setFilterOptions((prev) => ({
      ...prev,
      ...options,
    }));
  };

  // Handle custom date range
  useEffect(() => {
    if (filterOptions.timeRange === "custom" && !filterOptions.customDateRange) {
      // Set default custom date range if not provided
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7); // Default to last 7 days
      
      updateFilterOptions({
        customDateRange: { start, end }
      });
    }
  }, [filterOptions.timeRange, filterOptions.customDateRange]);

  const value = {
    filterOptions,
    updateFilterOptions,
  };

  return (
    <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}
