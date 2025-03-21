import { FC, useState } from "react";
import { Bell, HelpCircle, ChevronDown, Filter } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useDashboard } from "@/context/dashboard-context";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  title: string;
  unreadNotifications?: number;
}

const Header: FC<HeaderProps> = ({ 
  title,
  unreadNotifications = 0
}) => {
  const { user } = useAuth();
  const { filterOptions, updateFilterOptions } = useDashboard();
  
  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex justify-between items-center px-6 py-3">
        <div className="flex items-center">
          <h2 className="text-xl font-medium text-neutral-800">{title}</h2>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-neutral-600 focus:outline-none">
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute top-0 right-0 h-4 w-4 p-0 flex items-center justify-center text-xs"
                >
                  {unreadNotifications}
                </Badge>
              )}
            </Button>
          </div>
          <div className="relative">
            <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-neutral-600 focus:outline-none">
              <HelpCircle className="h-5 w-5" />
            </Button>
          </div>
          <div className="border-l pl-4 border-neutral-200">
            <Button variant="ghost" className="flex items-center text-sm">
              <span className="mr-2 text-neutral-700">{user?.name || 'Admin User'}</span>
              <ChevronDown className="h-4 w-4 text-neutral-400" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Filter bar */}
      <div className="px-6 py-2 bg-neutral-50 border-t border-b border-neutral-200 flex items-center justify-between">
        <div className="flex space-x-4 items-center">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-neutral-600">Time range:</span>
            <Select 
              value={filterOptions.timeRange} 
              onValueChange={(value) => updateFilterOptions({ timeRange: value as any })}
            >
              <SelectTrigger className="bg-white border border-neutral-300 rounded-md text-sm py-1 h-auto w-40">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-neutral-600">Risk level:</span>
            <Select 
              value={filterOptions.riskLevel} 
              onValueChange={(value) => updateFilterOptions({ riskLevel: value as any })}
            >
              <SelectTrigger className="bg-white border border-neutral-300 rounded-md text-sm py-1 h-auto w-40">
                <SelectValue placeholder="Select risk level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                <SelectItem value="critical">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-neutral-600">Transaction type:</span>
            <Select 
              value={filterOptions.transactionType} 
              onValueChange={(value) => updateFilterOptions({ transactionType: value as any })}
            >
              <SelectTrigger className="bg-white border border-neutral-300 rounded-md text-sm py-1 h-auto w-40">
                <SelectValue placeholder="Select transaction type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="fiat">Fiat transfers</SelectItem>
                <SelectItem value="crypto">Crypto transfers</SelectItem>
                <SelectItem value="cross_border">Cross-border</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div>
          <Button className="bg-primary hover:bg-primary/90 text-white px-4 py-1.5 rounded-md text-sm flex items-center">
            <Filter className="h-4 w-4 mr-1" />
            Advanced Filters
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
