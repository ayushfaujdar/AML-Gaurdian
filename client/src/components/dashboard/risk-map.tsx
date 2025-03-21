import { FC, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize, MoreVertical, ArrowRight } from "lucide-react";
import { useRiskData } from "@/hooks/use-risk-data";
import { RiskHeatMapCell } from "@/types";

interface RiskMapProps {
  className?: string;
}

const RiskMap: FC<RiskMapProps> = ({ className }) => {
  const { riskHeatMapData, isLoading, error } = useRiskData();
  const [cells, setCells] = useState<JSX.Element[]>([]);

  useEffect(() => {
    if (riskHeatMapData) {
      const cellElements = riskHeatMapData.map((cell: RiskHeatMapCell, index: number) => {
        // Calculate color based on risk score
        let bgColor = "bg-green-500";
        let opacity = "opacity-10";
        
        if (cell.risk > 80) {
          bgColor = "bg-red-600";
          opacity = "opacity-70";
        } else if (cell.risk > 60) {
          bgColor = "bg-red-500";
          opacity = "opacity-50";
        } else if (cell.risk > 40) {
          bgColor = "bg-orange-400";
          opacity = "opacity-40";
        } else if (cell.risk > 20) {
          bgColor = "bg-yellow-400";
          opacity = "opacity-30";
        }
        
        return <div key={index} className={`${bgColor} ${opacity}`}></div>;
      });
      
      setCells(cellElements);
    }
  }, [riskHeatMapData]);

  return (
    <Card className={className}>
      <CardHeader className="px-6 py-4 border-b border-neutral-200 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-medium text-neutral-800">Risk Heat Map</CardTitle>
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
        <div className="relative aspect-video bg-neutral-50 rounded flex items-center justify-center h-72">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
              <p className="text-neutral-500">Loading risk heat map...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center space-y-3">
              <p className="text-red-500 font-medium">Error loading risk data</p>
              <Button 
                onClick={() => useRiskData().refetch()} 
                size="sm" 
                variant="outline"
                className="flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry
              </Button>
            </div>
          ) : (
            <>
              <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 gap-px">
                {cells}
              </div>
              
              {/* Legend */}
              <div className="absolute bottom-4 right-4 bg-white p-2 rounded shadow-sm text-xs">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-600 rounded mr-2"></div>
                    <span>High Risk</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-400 rounded mr-2"></div>
                    <span>Medium Risk</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                    <span>Low Risk</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="mt-4 flex justify-between items-center text-sm text-neutral-600">
          <span>Risk is concentrated in cross-border transactions with high-risk jurisdictions</span>
          <Button variant="link" className="text-primary hover:text-primary/90 flex items-center p-0">
            View Detailed Analysis
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RiskMap;
