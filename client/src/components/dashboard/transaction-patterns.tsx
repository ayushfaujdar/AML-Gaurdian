import { FC } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize, MoreVertical } from "lucide-react";
import { cn, getRiskColor } from "@/lib/utils";
import { useTransactionData } from "@/hooks/use-transaction-data";
import { DetectedPattern } from "@/types";

interface TransactionPatternsProps {
  className?: string;
}

const TransactionPatterns: FC<TransactionPatternsProps> = ({ className }) => {
  const { transactionPatterns, timeSeriesData, isLoading, error } = useTransactionData();

  return (
    <Card className={className}>
      <CardHeader className="px-6 py-4 border-b border-neutral-200 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-medium text-neutral-800">Transaction Pattern Analysis</CardTitle>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-neutral-600">
            <Maximize className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-neutral-600">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <div className="aspect-video bg-neutral-50 rounded h-48 flex flex-col items-center justify-center">
              {isLoading ? (
                <p className="text-neutral-500">Loading transaction data...</p>
              ) : error ? (
                <p className="text-red-500">Error loading transaction data</p>
              ) : (
                <div className="w-full h-full flex items-end px-4 pb-4 space-x-1">
                  {timeSeriesData?.map((value, index) => {
                    const height = `h-${Math.floor(value * 100)}%`;
                    const isAnomaly = value > 0.7;  // Threshold for anomaly
                    return (
                      <div 
                        key={index} 
                        className={cn(
                          "w-full", 
                          isAnomaly ? "bg-status-critical" : "bg-primary",
                          `h-[${Math.floor(value * 100)}%]`
                        )}
                        style={{ height: `${Math.floor(value * 100)}%` }}
                      ></div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="mt-2 text-sm text-neutral-600">
              Transaction Volume Over Time - Spikes indicate potential structuring
            </div>
          </div>
          
          <div>
            <div className="bg-neutral-50 rounded p-4 h-48 overflow-y-auto">
              <h4 className="font-medium text-sm mb-3">Detected Patterns</h4>
              
              {isLoading ? (
                <p className="text-neutral-500 text-xs">Loading patterns...</p>
              ) : error ? (
                <p className="text-red-500 text-xs">Error loading patterns</p>
              ) : transactionPatterns && transactionPatterns.length > 0 ? (
                transactionPatterns.map((pattern: DetectedPattern, index: number) => (
                  <div key={index} className="mb-3 pb-3 border-b border-neutral-100 last:border-b-0 last:pb-0">
                    <div className="flex justify-between">
                      <span className="text-xs font-medium text-neutral-700">{pattern.name}</span>
                      <span className={cn("text-xs px-1.5 py-0.5 rounded", getRiskColor(pattern.riskLevel))}>
                        {pattern.riskLevel.charAt(0).toUpperCase() + pattern.riskLevel.slice(1)} Risk
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600 mt-1">{pattern.description}</p>
                  </div>
                ))
              ) : (
                <p className="text-neutral-500 text-xs">No patterns detected</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionPatterns;
