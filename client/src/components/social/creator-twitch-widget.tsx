import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useTwitchConnection } from '@/hooks/use-social-connection';
import { PlatformConnectionCard } from './platform-connection-card';
import { FaTwitch } from 'react-icons/fa';
import { Users, Video } from 'lucide-react';

export default function CreatorTwitchWidget() {
  const { user } = useAuth();
  const { isConnected, isConnecting, userInfo, error, connect, disconnect } = useTwitchConnection();

  // Only show for creators
  if (user?.userType !== 'creator') {
    return null;
  }

  return (
    <PlatformConnectionCard
      platform="Twitch"
      icon={<FaTwitch className="h-4 w-4" />}
      color="#9146FF"
      isConnected={isConnected}
      isConnecting={isConnecting}
      username={userInfo?.username}
      displayName={userInfo?.name}
      stats={[
        {
          icon: <Users className="h-4 w-4 text-[#9146FF]" />,
          label: 'Followers',
          value: (userInfo?.followersCount || userInfo?.followers_count || 0).toLocaleString(),
        },
        {
          icon: <Video className="h-4 w-4 text-purple-400" />,
          label: 'Streaming',
          value: 'Ready',
        },
      ]}
      pointsReward={500}
      profileUrl={userInfo?.username ? `https://twitch.tv/${userInfo.username}` : undefined}
      profileButtonLabel="Channel"
      description="Stream and engage with viewers"
      error={error}
      onConnect={connect}
      onDisconnect={disconnect}
    />
  );
}
