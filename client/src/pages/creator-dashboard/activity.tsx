import { useState, useEffect } from "react";
import { useCreatorActivity } from "@/hooks/use-creator-dashboard";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Download } from "lucide-react";

export default function ActivityPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("all");

  // Debounced search term to avoid too many API calls
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  // Debounce search term (500ms delay)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Fetch activities with search and filters from database
  const { data: activities = [], isLoading } = useCreatorActivity({
    search: debouncedSearch,
    type: filterType,
    dateFilter: filterDate
  });

  const displayActivities = activities;

  const handleExport = () => {
    // Implement CSV export logic
    console.log("Exporting activity data...");
  };

  return (
    <DashboardLayout userType="creator">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Activity Feed</h1>
          <p className="text-gray-400">
            Track all fan activity, redemptions, and program engagement
          </p>
        </div>

        {/* Filters & Search */}
        <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by fan name or activity..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>

              {/* Type Filter */}
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Activity Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="join">Joins</SelectItem>
                  <SelectItem value="earn">Points Earned</SelectItem>
                  <SelectItem value="redeem">Redemptions</SelectItem>
                  <SelectItem value="task">Task Completions</SelectItem>
                  <SelectItem value="campaign">Campaign Activity</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Filter */}
              <Select value={filterDate} onValueChange={setFilterDate}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Time Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="border-white/10 text-gray-300 hover:text-white hover:bg-white/10"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Activity List */}
        <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
          <CardHeader>
            <CardTitle className="text-white">
              All Activity ({displayActivities.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 10 }).map((_, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-white/5 animate-pulse">
                    <div className="w-2 h-2 rounded-full mt-2 bg-gray-600" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-600 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-700 rounded w-1/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {displayActivities.map((activity: any, index: number) => (
                  <div 
                    key={activity.id || index} 
                    className="flex items-start space-x-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      activity.type === 'join' ? 'bg-green-400' : 
                      activity.type === 'redeem' ? 'bg-yellow-400' : 
                      activity.type === 'task' ? 'bg-purple-400' :
                      activity.type === 'campaign' ? 'bg-orange-400' :
                      'bg-blue-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">
                        <span className="font-medium">{activity.fan || 'A fan'}</span>{' '}
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-400">
                        {activity.timestamp || 'Unknown time'}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {activity.type}
                    </div>
                  </div>
                ))}
                
                {displayActivities.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-400">No activities found matching your filters.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

