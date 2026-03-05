/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Facebook, Users, TrendingUp, Check, Download } from 'lucide-react';
import { type FacebookPage, type FacebookUser } from '@/lib/facebook';
import { useFacebookConnection } from '@/hooks/use-social-connection';

interface FacebookConnectProps {
  onConnectionSuccess?: (pageData: FacebookPage) => void;
  className?: string;
}

export function FacebookConnect({ onConnectionSuccess, className }: FacebookConnectProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    isConnected,
    isConnecting,
    userInfo,
    connect: connectFacebook,
    disconnect: disconnectFacebook,
  } = useFacebookConnection();
  const [isImportingProfile, setIsImportingProfile] = useState(false);
  const [connectedPages, setConnectedPages] = useState<FacebookPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<FacebookPage | null>(null);

  // Load pages from database when connected
  useEffect(() => {
    if (isConnected) {
      loadPages();
    } else {
      setConnectedPages([]);
      setSelectedPage(null);
    }
  }, [isConnected]);

  const loadPages = async () => {
    try {
      const { getSocialConnection } = await import('@/lib/social-connection-api');
      const { connection } = await getSocialConnection('facebook');
      if (connection?.profileData?.pages?.length) {
        setConnectedPages(connection.profileData.pages);
        const savedId = localStorage.getItem('fandomly_active_facebook_page_id');
        const page =
          connection.profileData.pages.find((p: any) => p.id === savedId) ||
          connection.profileData.pages[0];
        setSelectedPage(page);
      }
    } catch (error) {
      console.error('Error loading Facebook pages:', error);
    }
  };

  // Removed automatic refresh on mount - Facebook connection is now opt-in only

  const importFacebookProfile = async (facebookData: FacebookUser) => {
    if (!user) {
      console.log('No authenticated user, skipping profile import');
      return;
    }

    setIsImportingProfile(true);
    try {
      const res = await fetch('/api/auth/facebook-profile-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: user.id,
          facebookData: {
            id: facebookData.id,
            name: facebookData.name,
            email: (facebookData as any).email,
            likes: (facebookData as any).likes,
          },
        }),
      });
      const data = await res.json();
      if (data?.success) {
        toast({ title: 'Profile Updated', description: 'Facebook profile imported.' });
      }
    } catch {
      toast({
        title: 'Import Failed',
        description: 'Could not import your Facebook profile data.',
        variant: 'destructive',
      });
    } finally {
      setIsImportingProfile(false);
    }
  };

  const handleConnect = async () => {
    try {
      await connectFacebook();
    } catch {
      toast({
        title: 'Connection Error',
        description: 'Unable to connect to Facebook',
        variant: 'destructive',
      });
    }
  };

  const handlePageSelect = async (page: FacebookPage) => {
    setSelectedPage(page);
    localStorage.setItem('fandomly_active_facebook_page_id', page.id);
    onConnectionSuccess?.(page);
  };

  if (!isConnected) {
    return (
      <Card className={`bg-white/5 backdrop-blur-lg border-white/10 ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Facebook className="h-5 w-5 text-blue-400" />
            Connect Facebook Page
          </CardTitle>
          <p className="text-gray-300 text-sm">
            Connect your Facebook page to run social media campaigns and track engagement for your
            loyalty program.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isConnecting ? 'Connecting…' : 'Connect with Facebook'}
            </Button>
          </div>
          <div className="mt-4 text-xs text-gray-400 space-y-1">
            <p>Permissions requested:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>public_profile, email</li>
              <li>pages_show_list, pages_read_engagement</li>
              <li>business_management, instagram_basic</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-white/5 backdrop-blur-lg border-white/10 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Facebook className="h-5 w-5 text-blue-400" />
            Facebook Connected
            <Check className="h-4 w-4 text-green-400" />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={disconnectFacebook}
            className="text-gray-300 border-gray-600 hover:bg-red-500/10"
            data-testid="button-facebook-disconnect"
          >
            Disconnect
          </Button>
        </CardTitle>
        {userInfo && (
          <div className="text-gray-300 text-sm space-y-2">
            <p>Connected as {userInfo.name}</p>
            {(userInfo as any).email && <p className="text-xs">Email: {(userInfo as any).email}</p>}
            <p className="text-xs">ID: {userInfo.id}</p>
            {(userInfo as any).likes && (
              <p className="text-xs">
                Likes: {(userInfo as any).likes.data?.length || 0} pages/interests
              </p>
            )}
            {user && (
              <div className="pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => importFacebookProfile(userInfo as any as FacebookUser)}
                  disabled={isImportingProfile}
                  className="text-blue-400 border-blue-600 hover:bg-blue-500/10"
                  data-testid="button-import-facebook-profile"
                >
                  <Download className="mr-2 h-3 w-3" />
                  {isImportingProfile ? 'Importing...' : 'Import Profile Data'}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {connectedPages.length > 0 && (
          <div>
            <h4 className="text-white font-medium mb-3">Select Your Page for Campaigns:</h4>
            <div className="space-y-2">
              {connectedPages.map((page) => (
                <div
                  key={page.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedPage?.id === page.id
                      ? 'border-brand-primary bg-brand-primary/10'
                      : 'border-gray-600 hover:border-gray-500 bg-white/5'
                  }`}
                  onClick={() => handlePageSelect(page)}
                  data-testid={`card-facebook-page-${page.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-white font-medium">{page.name}</h5>
                      <p className="text-gray-400 text-sm capitalize">{(page as any).category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {(page as any).fan_count && (
                        <Badge variant="secondary" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {(page as any).fan_count.toLocaleString()}
                        </Badge>
                      )}
                      {selectedPage?.id === page.id && <Check className="h-4 w-4 text-green-400" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-3">
              <Button
                variant="outline"
                className="border-white/20 text-gray-300 hover:bg-white/10"
                onClick={async () => {
                  try {
                    if (!user) return;
                    const mapped = connectedPages.map((p) => ({
                      id: p.id,
                      name: p.name,
                      access_token: (p as any).access_token,
                      followers_count: (p as any).followers_count || (p as any).fan_count,
                      fan_count: (p as any).fan_count,
                      instagram_business_account: (p as any).instagram_business_account,
                    }));
                    const creatorId = (user as any)?.creator?.id || user.id;
                    await fetch(`/api/creators/${creatorId}/facebook-pages`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({ pages: mapped }),
                    });
                    toast({
                      title: 'Saved Pages',
                      description: 'Your pages are saved for use in campaigns and webhooks.',
                    });
                  } catch (e: any) {
                    toast({
                      title: 'Save Failed',
                      description: e?.message || 'Unknown error',
                      variant: 'destructive',
                    });
                  }
                }}
              >
                Save Pages to Backend
              </Button>
            </div>
          </div>
        )}

        {selectedPage && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="font-medium">Campaign Ready</span>
            </div>
            <p className="text-gray-300 text-sm">
              Your Facebook page &ldquo;{selectedPage.name}&rdquo; is connected and ready for social
              media campaigns.
            </p>
          </div>
        )}

        {connectedPages.length === 0 && (
          <div className="text-center py-4">
            <p className="text-gray-400 text-sm">
              No Facebook pages found. Make sure you&apos;re an admin of at least one Facebook page.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default FacebookConnect;
