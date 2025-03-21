import { FC, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  changePercent: number;
  iconBgColor?: string;
  children?: ReactNode;
  className?: string;
}

const KpiCard: FC<KpiCardProps> = ({
  title,
  value,
  icon,
  changePercent,
  iconBgColor = "bg-red-100",
  className,
  children,
}) => {
  const getChangeTextColor = () => {
    if (changePercent > 0) return "text-red-600";
    if (changePercent < 0) return "text-green-600";
    return "text-blue-600";
  };

  const getChangeIcon = () => {
    if (changePercent > 0) return <ArrowUpIcon className="h-4 w-4 mr-1" />;
    if (changePercent < 0) return <ArrowDownIcon className="h-4 w-4 mr-1" />;
    return <MinusIcon className="h-4 w-4 mr-1" />;
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-neutral-500">{title}</p>
            <h3 className="text-2xl font-medium mt-1 text-neutral-900">{value}</h3>
          </div>
          <div className={cn("p-2 rounded-full", iconBgColor)}>
            {icon}
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center">
            <span className={cn("text-sm flex items-center", getChangeTextColor())}>
              {getChangeIcon()}
              {Math.abs(changePercent)}%
            </span>
            <span className="text-neutral-500 text-sm ml-2">from previous period</span>
          </div>
          {children}
        </div>
      </CardContent>
    </Card>
  );
};

export default KpiCard;
