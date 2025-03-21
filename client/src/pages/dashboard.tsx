import { FC } from "react";
import Sidebar from "@/components/dashboard/sidebar";
import Header from "@/components/dashboard/header";
import KpiCard from "@/components/dashboard/kpi-card";
import RiskMap from "@/components/dashboard/risk-map";
import TransactionPatterns from "@/components/dashboard/transaction-patterns";
import PriorityAlerts from "@/components/dashboard/priority-alerts";
import EntityNetwork from "@/components/dashboard/entity-network";
import RecentActivity from "@/components/dashboard/recent-activity";
import { AlertTriangle, Users, Search, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { KpiData } from "@/types";

const Dashboard: FC = () => {
  const { data: kpiData, isLoading, error } = useQuery<KpiData>({
    queryKey: ["/api/dashboard/stats"],
  });

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="AML System Dashboard" unreadNotifications={3} />
        
        <main className="flex-1 overflow-y-auto bg-neutral-50 p-6">
          {/* KPI cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <KpiCard 
              title="Alerts Generated" 
              value={isLoading ? "--" : kpiData?.alertsCount || 0}
              icon={<AlertTriangle className="h-5 w-5 text-status-critical" />}
              changePercent={isLoading ? 0 : kpiData?.alertsChange || 0}
              iconBgColor="bg-red-100"
            />
            
            <KpiCard 
              title="High Risk Entities" 
              value={isLoading ? "--" : kpiData?.highRiskEntitiesCount || 0}
              icon={<Users className="h-5 w-5 text-accent" />}
              changePercent={isLoading ? 0 : kpiData?.highRiskEntitiesChange || 0}
              iconBgColor="bg-orange-100"
            />
            
            <KpiCard 
              title="Cases Under Investigation" 
              value={isLoading ? "--" : kpiData?.casesCount || 0}
              icon={<Search className="h-5 w-5 text-primary" />}
              changePercent={isLoading ? 0 : kpiData?.casesChange || 0}
              iconBgColor="bg-blue-100"
            />
            
            <KpiCard 
              title="Reports Filed" 
              value={isLoading ? "--" : kpiData?.reportsCount || 0}
              icon={<FileText className="h-5 w-5 text-secondary" />}
              changePercent={isLoading ? 0 : kpiData?.reportsChange || 0}
              iconBgColor="bg-green-100"
            />
          </div>
          
          {/* Main content area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column: Risk Map & Transaction Patterns */}
            <div className="lg:col-span-2 space-y-6">
              <RiskMap />
              <TransactionPatterns />
            </div>
            
            {/* Right column: Alerts & Entity Analysis */}
            <div className="space-y-6">
              <PriorityAlerts />
              <EntityNetwork />
            </div>
          </div>
          
          {/* Recent Activity */}
          <RecentActivity className="mt-6" />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
