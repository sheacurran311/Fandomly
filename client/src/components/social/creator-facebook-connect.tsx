import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Facebook, User, CheckCircle, AlertCircle, Unlink, Plus, Users } from "lucide-react";
import { useFacebookConnection } from "@/contexts/facebook-connection-context";

export default function CreatorFacebookConnect() {
  // Use the context instead of managing own state
  const {
    isConnected,
    isConnecting,
    userInfo,
    connectedPages: pages,
    selectedPage,
    connectFacebook,
    disconnectFacebook,
    selectPage,
    refreshConnection
  } = useFacebookConnection();

  // Refresh connection status when component mounts
  useEffect(() => {
    if (refreshConnection) {
      refreshConnection();
    }
  }, [refreshConnection]);

  const handlePageSelect = async (page: any) => {
    await selectPage(page);
  };

  return (
    <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
      <CardHeader>
        <CardTitle className="text-white text-sm flex items-center">
          <Facebook className="h-4 w-4 mr-2 text-blue-500" />
          Facebook Creator Connect
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected && userInfo ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                {userInfo.picture?.data?.url ? (
                  <img 
                    src={userInfo.picture.data.url} 
                    alt={userInfo.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5 text-blue-400" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{userInfo.name}</p>
                <p className="text-xs text-gray-400">Connected to Facebook</p>
                {userInfo.email && (
                  <p className="text-xs text-gray-500">{userInfo.email}</p>
                )}
              </div>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>

            {pages && pages.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-400 uppercase">Connected Pages</span>
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    <Users className="h-3 w-3 mr-1" />
                    {pages.length}
                  </Badge>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {pages.map((page) => (
                    <div 
                      key={page.id}
                      className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedPage?.id === page.id
                          ? 'bg-blue-500/20 border-blue-500/50'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                      onClick={() => handlePageSelect(page)}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center overflow-hidden">
                          {page.picture?.data?.url ? (
                            <img src={page.picture.data.url} alt={page.name} className="w-full h-full object-cover" />
                          ) : (
                            <Users className="h-4 w-4 text-blue-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">{page.name}</p>
                          <p className="text-xs text-gray-500 truncate">{page.category || 'Page'}</p>
                        </div>
                        {selectedPage?.id === page.id && (
                          <CheckCircle className="h-4 w-4 text-blue-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button 
              variant="outline" 
              size="sm" 
              className="w-full border-white/20 text-gray-300 hover:bg-white/10"
              onClick={disconnectFacebook}
              data-testid="button-disconnect-facebook-creator"
            >
              <Unlink className="h-4 w-4 mr-1" />
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-center py-3">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <Facebook className="h-6 w-6 text-blue-500" />
              </div>
              <p className="text-sm text-white font-medium mb-1">Connect Facebook</p>
              <p className="text-xs text-gray-400">Manage your Facebook pages and reach your audience</p>
            </div>
            
            <Button 
              className="w-full bg-brand-primary hover:bg-brand-primary/80"
              onClick={connectFacebook}
              disabled={isConnecting}
              data-testid="button-connect-facebook-creator"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isConnecting ? 'Connecting...' : 'Connect Facebook'}
            </Button>
            
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Connect to manage campaigns and engage with your community
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
