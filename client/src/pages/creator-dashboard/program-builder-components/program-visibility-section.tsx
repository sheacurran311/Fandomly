import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

interface ProfileDataVisibility {
  showBio?: boolean;
  showSocialLinks?: boolean;
  showTiers?: boolean;
  showVerificationBadge?: boolean;
  showLocation?: boolean;
  showWebsite?: boolean;
  showJoinDate?: boolean;
  showFollowerCount?: boolean;
}

interface ProgramVisibilitySectionProps {
  isProgramPublished: boolean;
  showProfile: boolean;
  showCampaigns: boolean;
  showTasks: boolean;
  showRewards: boolean;
  showLeaderboard: boolean;
  showActivityFeed: boolean;
  showFanWidget: boolean;
  showSocialFeed: boolean;
  profileData: ProfileDataVisibility;
  onShowProfileChange: (show: boolean) => void;
  onShowCampaignsChange: (show: boolean) => void;
  onShowTasksChange: (show: boolean) => void;
  onShowRewardsChange: (show: boolean) => void;
  onShowLeaderboardChange: (show: boolean) => void;
  onShowActivityFeedChange: (show: boolean) => void;
  onShowFanWidgetChange: (show: boolean) => void;
  onShowSocialFeedChange: (show: boolean) => void;
  onProfileDataChange: (data: ProfileDataVisibility) => void;
}

export function ProgramVisibilitySection({
  isProgramPublished,
  showProfile,
  showCampaigns,
  showTasks,
  showRewards,
  showLeaderboard,
  showActivityFeed,
  showFanWidget,
  showSocialFeed,
  profileData,
  onShowProfileChange,
  onShowCampaignsChange,
  onShowTasksChange,
  onShowRewardsChange,
  onShowLeaderboardChange,
  onShowActivityFeedChange,
  onShowFanWidgetChange,
  onShowSocialFeedChange,
  onProfileDataChange,
}: ProgramVisibilitySectionProps) {
  return (
    <Card className="bg-white/5 backdrop-blur-lg border-white/10">
      <CardHeader>
        <CardTitle className="text-white">Page Sections</CardTitle>
        <p className="text-sm text-gray-400">Control what appears on your public program page</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Show Profile Tab - with granular controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <p className="text-white font-medium">Show Profile Tab</p>
              <p className="text-sm text-gray-400">
                Display your profile information and about section
              </p>
            </div>
            <Switch checked={showProfile} onCheckedChange={onShowProfileChange} />
          </div>

          {/* Collapsible Profile Data Controls */}
          {showProfile && (
            <div className="ml-6 space-y-2 border-l-2 border-brand-primary/30 pl-4">
              <p className="text-xs text-gray-400 mb-2 italic">Profile Data Visibility</p>

              <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                <span className="text-white text-sm">Show Bio/Description</span>
                <Switch
                  checked={profileData?.showBio ?? true}
                  onCheckedChange={(checked) =>
                    onProfileDataChange({ ...profileData, showBio: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                <span className="text-white text-sm">Show Social Links</span>
                <Switch
                  checked={profileData?.showSocialLinks ?? true}
                  onCheckedChange={(checked) =>
                    onProfileDataChange({ ...profileData, showSocialLinks: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                <span className="text-white text-sm">Show Reward Tiers</span>
                <Switch
                  checked={profileData?.showTiers ?? true}
                  onCheckedChange={(checked) =>
                    onProfileDataChange({ ...profileData, showTiers: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                <span className="text-white text-sm">Show Verification Badge</span>
                <Switch
                  checked={profileData?.showVerificationBadge ?? true}
                  onCheckedChange={(checked) =>
                    onProfileDataChange({ ...profileData, showVerificationBadge: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                <span className="text-white text-sm">Show Location</span>
                <Switch
                  checked={profileData?.showLocation ?? true}
                  onCheckedChange={(checked) =>
                    onProfileDataChange({ ...profileData, showLocation: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                <span className="text-white text-sm">Show Website</span>
                <Switch
                  checked={profileData?.showWebsite ?? true}
                  onCheckedChange={(checked) =>
                    onProfileDataChange({ ...profileData, showWebsite: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                <span className="text-white text-sm">Show Join Date</span>
                <Switch
                  checked={profileData?.showJoinDate ?? true}
                  onCheckedChange={(checked) =>
                    onProfileDataChange({ ...profileData, showJoinDate: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                <span className="text-white text-sm">Show Follower Count</span>
                <Switch
                  checked={profileData?.showFollowerCount ?? true}
                  onCheckedChange={(checked) =>
                    onProfileDataChange({ ...profileData, showFollowerCount: checked })
                  }
                />
              </div>
            </div>
          )}
        </div>

        {isProgramPublished ? (
          <>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <p className="text-white font-medium">Show Campaigns Tab</p>
                <p className="text-sm text-gray-400">Display active and upcoming campaigns</p>
              </div>
              <Switch checked={showCampaigns} onCheckedChange={onShowCampaignsChange} />
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <p className="text-white font-medium">Show Tasks Tab</p>
                <p className="text-sm text-gray-400">Display available tasks for fans</p>
              </div>
              <Switch checked={showTasks} onCheckedChange={onShowTasksChange} />
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <p className="text-white font-medium">Show Rewards Tab</p>
                <p className="text-sm text-gray-400">Display reward store and available rewards</p>
              </div>
              <Switch checked={showRewards} onCheckedChange={onShowRewardsChange} />
            </div>
          </>
        ) : (
          <div className="p-3 bg-white/5 rounded-lg border border-dashed border-white/10">
            <p className="text-gray-400 text-sm text-center">
              Publish your program to configure Campaigns, Tasks, and Rewards visibility.
            </p>
          </div>
        )}
        <Separator className="bg-white/10" />
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
          <div>
            <p className="text-white font-medium">Show Leaderboard Widget</p>
            <p className="text-sm text-gray-400">Display top fans leaderboard in sidebar</p>
          </div>
          <Switch checked={showLeaderboard} onCheckedChange={onShowLeaderboardChange} />
        </div>
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
          <div>
            <p className="text-white font-medium">Show Activity Feed</p>
            <p className="text-sm text-gray-400">Display recent activity and announcements</p>
          </div>
          <Switch checked={showActivityFeed} onCheckedChange={onShowActivityFeedChange} />
        </div>
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
          <div>
            <p className="text-white font-medium">Show Fan Stats Widget</p>
            <p className="text-sm text-gray-400">Display community stats and engagement metrics</p>
          </div>
          <Switch checked={showFanWidget} onCheckedChange={onShowFanWidgetChange} />
        </div>
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
          <div>
            <p className="text-white font-medium">Show Social Content Feed</p>
            <p className="text-sm text-gray-400">
              Display your synced posts and videos from connected platforms
            </p>
          </div>
          <Switch checked={showSocialFeed} onCheckedChange={onShowSocialFeedChange} />
        </div>
      </CardContent>
    </Card>
  );
}
