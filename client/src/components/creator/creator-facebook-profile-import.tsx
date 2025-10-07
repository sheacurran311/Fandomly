import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FacebookSDKManager as FacebookSDK } from "@/lib/facebook";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  Facebook, 
  Users, 
  BarChart3,
  CheckCircle,
  Download,
  RefreshCw,
  Building2,
  TrendingUp
} from "lucide-react";

interface FacebookPageData {
  id: string;
  name: string;
  category: string;
  followers_count?: number;
  fan_count?: number;
  access_token: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

interface CreatorFacebookProfileImportProps {
  className?: string;
}

export default function CreatorFacebookProfileImport({ className }: CreatorFacebookProfileImportProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [pages, setPages] = useState<FacebookPageData[]>([]);
  const [selectedPage, setSelectedPage] = useState<FacebookPageData | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  // Check Facebook login status on component mount
  useEffect(() => {
    checkFacebookStatus();
  }, []);

  const checkFacebookStatus = async () => {
    try {
      await FacebookSDK.ensureFBReady('creator');
      const status = await FacebookSDK.getLoginStatus();
      setIsCheckingStatus(false);
      
      if (status.isLoggedIn) {
        setIsConnected(true);
        await loadBusinessPages();
      } else {
        setIsConnected(false);
        setPages([]);
        setSelectedPage(null);
      }
    } catch (error) {
      console.error('Error checking Facebook status:', error);
      setIsCheckingStatus(false);
    }
  };

  const loadBusinessPages = async () => {
    try {
      window.FB.api('/me/accounts', 'GET', {}, (response) => {
        if (response && response.data && !response.error) {
          const businessPages = response.data.map((page: any) => ({
            id: page.id,
            name: page.name,
            category: page.category,
            access_token: page.access_token,
            // Get additional page insights
            followers_count: 0, // Will be loaded separately
            fan_count: 0
          }));
          
          setPages(businessPages);
          
          // Load additional page data for each page
          businessPages.forEach((page: FacebookPageData) => {
            loadPageDetails(page);
          });
        }
      });
    } catch (error) {
      console.error('Error loading business pages:', error);
    }
  };

  const loadPageDetails = async (page: FacebookPageData) => {
    try {
      // Get page picture and follower count
      window.FB.api(`/${page.id}`, 'GET', {
        fields: 'picture.width(200).height(200),fan_count,followers_count',
        access_token: page.access_token
      }, (response) => {
        if (response && !response.error) {
          setPages(prev => prev.map(p => 
            p.id === page.id ? {
              ...p,
              picture: response.picture,
              fan_count: response.fan_count || 0,
              followers_count: response.followers_count || response.fan_count || 0
            } : p
          ));
        }
      });
    } catch (error) {
      console.error('Error loading page details for:', page.name, error);
    }
  };

  const connectToFacebook = async () => {
    try {
      await FacebookSDK.ensureFBReady('creator');
      const result = await FacebookSDK.secureLogin('creator');
      
      if (result.success) {
        setIsConnected(true);
        await loadBusinessPages();
        toast({
          title: "Facebook Connected",
          description: "Successfully connected to Facebook Business Account",
          variant: "default",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.error || "Failed to connect to Facebook",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Facebook connection error:', error);
      toast({
        title: "Connection Error",
        description: "An error occurred while connecting to Facebook",
        variant: "destructive",
      });
    }
  };

  const importBusinessPageData = useMutation({
    mutationFn: async (pageData: FacebookPageData) => {
      if (!user) throw new Error("No user found");
      
      return apiRequest("POST", "/api/auth/facebook-business-import", {
        pageData: {
          id: pageData.id,
          name: pageData.name,
          category: pageData.category,
          followers_count: pageData.followers_count,
          fan_count: pageData.fan_count,
          picture: pageData.picture?.data?.url
        }
      });
    },
    onSuccess: (data) => {
      // Invalidate user query to refetch updated data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: "Business Page Data Imported",
        description: `Successfully imported data for ${selectedPage?.name}`,
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import business page data",
        variant: "destructive",
      });
    }
  });

  const handleImportBusinessPage = async () => {
    if (!selectedPage) {
      toast({
        title: "No Page Selected",
        description: "Please select a business page to import",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      await importBusinessPageData.mutateAsync(selectedPage);
    } finally {
      setIsImporting(false);
    }
  };

  if (isCheckingStatus) {
    return (
      <Card className={`bg-white/5 backdrop-blur-lg border-white/10 ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-white">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Checking Facebook connection...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-white/5 backdrop-blur-lg border-white/10 ${className}`}>
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <Facebook className="h-5 w-5 text-blue-500" />
          <span>Connect Your Business Page</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="text-center space-y-4">
            <Building2 className="h-12 w-12 text-blue-500 mx-auto" />
            <div>
              <p className="text-gray-300 mb-2">
                Connect your Facebook Business Account to access page analytics and engagement data
              </p>
              <p className="text-sm text-gray-400">
                Required permissions: Business Page Management, Page Analytics, Engagement Data
              </p>
            </div>
            <Button 
              onClick={connectToFacebook}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-connect-facebook-business"
            >
              <Facebook className="h-4 w-4 mr-2" />
              Connect Facebook Business
            </Button>
          </div>
        ) : pages.length === 0 ? (
          <div className="text-center space-y-4">
            <div className="text-gray-300">
              <p>No business pages found.</p>
              <p className="text-sm text-gray-400">Make sure you have admin access to Facebook business pages.</p>
            </div>
            <Button 
              onClick={checkFacebookStatus}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-white font-medium mb-3">Select Your Business Page:</h3>
              <div className="space-y-2">
                {pages.map((page) => (
                  <div
                    key={page.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedPage?.id === page.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                    }`}
                    onClick={() => setSelectedPage(page)}
                    data-testid={`button-select-page-${page.id}`}
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage 
                        src={page.picture?.data?.url} 
                        alt={page.name} 
                      />
                      <AvatarFallback className="bg-blue-600 text-white">
                        <Building2 className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="text-white font-medium">{page.name}</div>
                      <div className="text-sm text-gray-400">{page.category}</div>
                      {(page.followers_count || 0) > 0 && (
                        <div className="flex items-center space-x-2 text-xs text-gray-400">
                          <Users className="h-3 w-3" />
                          <span>{(page.followers_count || 0).toLocaleString()} followers</span>
                        </div>
                      )}
                    </div>
                    {selectedPage?.id === page.id && (
                      <CheckCircle className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {selectedPage && (
              <div className="bg-white/5 rounded-lg p-4 space-y-3">
                <h4 className="text-white font-medium flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>Import Business Data</span>
                </h4>
                <p className="text-sm text-gray-300">
                  Import page analytics, follower demographics, and engagement metrics to enhance your creator profile.
                </p>
                <Button
                  onClick={handleImportBusinessPage}
                  disabled={isImporting || importBusinessPageData.isPending}
                  className="bg-brand-primary hover:bg-brand-primary/80 text-white w-full"
                  data-testid="button-import-business-data"
                >
                  {isImporting || importBusinessPageData.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Importing Business Data...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Import Business Data
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}