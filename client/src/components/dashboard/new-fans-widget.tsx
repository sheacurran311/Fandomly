import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, ExternalLink } from "lucide-react";
import { Link } from "wouter";

interface NewFan {
  id: string;
  name: string;
  username: string;
  joinedAt: string;
  avatar?: string;
}

export default function NewFansWidget() {
  // Mock data - replace with actual API call
  const newFans: NewFan[] = [
    { id: "1", name: "Alex Thompson", username: "@alexthom", joinedAt: "2 hours ago" },
    { id: "2", name: "Jordan Lee", username: "@jordanl", joinedAt: "5 hours ago" },
    { id: "3", name: "Taylor Swift", username: "@tswiftfan", joinedAt: "1 day ago" },
    { id: "4", name: "Morgan Davis", username: "@morgand", joinedAt: "1 day ago" },
    { id: "5", name: "Casey Brown", username: "@caseyb", joinedAt: "2 days ago" },
  ];
  
  const weeklyGrowth = 23; // Mock data
  
  return (
    <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-400" />
            <span>New Fans</span>
          </div>
          <Link href="/creator-dashboard/fans">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-gray-400 hover:text-white hover:bg-white/10"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View All
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Weekly Growth Banner */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-400/10 border border-green-400/20">
            <TrendingUp className="h-4 w-4 text-green-400" />
            <div>
              <div className="text-green-400 font-bold text-sm">
                +{weeklyGrowth} this week
              </div>
              <div className="text-gray-400 text-xs">
                Growing steadily
              </div>
            </div>
          </div>
          
          {/* Recent Fans List */}
          <div className="space-y-2">
            <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              Recent Signups
            </div>
            {newFans.map((fan) => (
              <div
                key={fan.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={fan.avatar} alt={fan.name} />
                  <AvatarFallback className="bg-brand-primary/20 text-brand-primary text-xs">
                    {fan.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">
                    {fan.name}
                  </div>
                  <div className="text-gray-400 text-xs truncate">
                    {fan.username}
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {fan.joinedAt}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

