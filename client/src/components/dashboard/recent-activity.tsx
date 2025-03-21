import { FC } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatDate, getStatusColor } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Activity } from "@/types";

interface RecentActivityProps {
  className?: string;
}

const RecentActivity: FC<RecentActivityProps> = ({ className }) => {
  const { data: activities, isLoading, error } = useQuery<Activity[]>({
    queryKey: ["/api/dashboard/recent-activities"],
  });

  return (
    <Card className={className}>
      <CardHeader className="px-6 py-4 border-b border-neutral-200 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-medium text-neutral-800">Recent Investigation Activity</CardTitle>
        <Button variant="link" className="text-primary hover:text-primary/90 p-0 h-auto">View All Activity</Button>
      </CardHeader>
      <CardContent className="p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Timestamp</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">User</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Activity</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Entity/Case</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-neutral-500">
                    Loading activities...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-red-500">
                    Error loading activity data
                  </td>
                </tr>
              ) : activities && activities.length > 0 ? (
                activities.map((activity: Activity, index: number) => (
                  <tr key={index} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 text-sm text-neutral-600">
                      {formatDate(activity.timestamp)}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{activity.user}</td>
                    <td className="px-4 py-3 text-sm text-neutral-800">{activity.actionDescription}</td>
                    <td className="px-4 py-3 text-sm font-mono text-neutral-600">
                      {activity.entityId || activity.caseId || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-1 text-xs rounded", getStatusColor(activity.status))}>
                        {activity.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Button 
                        variant="link" 
                        className="text-primary hover:text-primary/90 p-0 h-auto"
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-neutral-500">
                    No recent activities found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
