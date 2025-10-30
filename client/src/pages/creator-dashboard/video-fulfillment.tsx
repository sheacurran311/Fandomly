import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Video, Clock, CheckCircle2, AlertCircle, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { VideoUpload } from "@/components/ui/video-upload";
import { formatDistanceToNow } from "date-fns";

interface VideoRequest {
  id: string;
  fanName: string;
  fanUsername: string;
  rewardName: string;
  personalizationMessage: string;
  pointsCost: number;
  requestedAt: string;
  status: 'pending' | 'fulfilled' | 'cancelled';
  videoUrl?: string;
  fulfilledAt?: string;
  turnaroundDays: number;
}

export default function VideoFulfillment() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<VideoRequest | null>(null);
  const [fulfillModalOpen, setFulfillModalOpen] = useState(false);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string>('');

  // Fetch pending video requests
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['/api/video-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await apiRequest('GET', `/api/video-requests/creator/${user.id}`);
      return response.json();
    },
    enabled: !!user?.id,
  });

  const fulfillMutation = useMutation({
    mutationFn: async ({ requestId, videoUrl }: { requestId: string; videoUrl: string }) => {
      const response = await apiRequest('PUT', `/api/video-requests/${requestId}/fulfill`, {
        videoUrl,
        fulfilledAt: new Date().toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/video-requests'] });
      toast({
        title: "Video Sent!",
        description: "The fan has been notified about their custom video.",
      });
      setFulfillModalOpen(false);
      setSelectedRequest(null);
      setUploadedVideoUrl('');
    },
    onError: (error) => {
      toast({
        title: "Fulfillment Failed",
        description: error instanceof Error ? error.message : "Failed to fulfill video request",
        variant: "destructive",
      });
    }
  });

  const handleFulfill = (request: VideoRequest) => {
    setSelectedRequest(request);
    setFulfillModalOpen(true);
  };

  const handleSubmitVideo = () => {
    if (!uploadedVideoUrl || !selectedRequest) {
      toast({
        title: "Video Required",
        description: "Please upload a video before submitting.",
        variant: "destructive",
      });
      return;
    }

    fulfillMutation.mutate({
      requestId: selectedRequest.id,
      videoUrl: uploadedVideoUrl,
    });
  };

  const pendingRequests = requests.filter((r: VideoRequest) => r.status === 'pending');
  const fulfilledRequests = requests.filter((r: VideoRequest) => r.status === 'fulfilled');

  const getDaysUntilDue = (requestedAt: string, turnaroundDays: number) => {
    const dueDate = new Date(requestedAt);
    dueDate.setDate(dueDate.getDate() + turnaroundDays);
    const now = new Date();
    const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft;
  };

  return (
    <DashboardLayout userType="creator">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Video className="h-8 w-8 text-pink-500" />
            Video Fulfillment
          </h1>
          <p className="text-gray-400">
            Manage and fulfill custom video requests from your fans
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Pending Requests</p>
                  <p className="text-3xl font-bold text-white">{pendingRequests.length}</p>
                </div>
                <AlertCircle className="h-10 w-10 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Fulfilled</p>
                  <p className="text-3xl font-bold text-white">{fulfilledRequests.length}</p>
                </div>
                <CheckCircle2 className="h-10 w-10 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Requests</p>
                  <p className="text-3xl font-bold text-white">{requests.length}</p>
                </div>
                <Video className="h-10 w-10 text-pink-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="bg-white/5">
            <TabsTrigger value="pending">
              Pending ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="fulfilled">
              Fulfilled ({fulfilledRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {isLoading ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading requests...</p>
                </CardContent>
              </Card>
            ) : pendingRequests.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-8 text-center">
                  <Video className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Pending Requests</h3>
                  <p className="text-gray-400">
                    You don't have any pending video requests at the moment.
                  </p>
                </CardContent>
              </Card>
            ) : (
              pendingRequests.map((request: VideoRequest) => {
                const daysLeft = getDaysUntilDue(request.requestedAt, request.turnaroundDays);
                const isUrgent = daysLeft <= 2;
                
                return (
                  <Card key={request.id} className="bg-white/5 border-white/10 hover:border-pink-500/30 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="h-12 w-12 rounded-full bg-pink-500/20 flex items-center justify-center">
                              <Video className="h-6 w-6 text-pink-500" />
                            </div>
                            <div>
                              <h3 className="text-white font-semibold">{request.rewardName}</h3>
                              <p className="text-sm text-gray-400">
                                Requested by <span className="text-brand-primary">@{request.fanUsername}</span>
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="p-3 bg-white/5 rounded border border-white/10">
                              <p className="text-xs text-gray-400 mb-1">Personalization Message:</p>
                              <p className="text-white text-sm">{request.personalizationMessage}</p>
                            </div>

                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-400">
                                  Requested {formatDistanceToNow(new Date(request.requestedAt), { addSuffix: true })}
                                </span>
                              </div>
                              <Badge 
                                variant="outline" 
                                className={isUrgent ? 'border-red-500/30 text-red-400' : 'border-yellow-500/30 text-yellow-400'}
                              >
                                {daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <Button
                          onClick={() => handleFulfill(request)}
                          className="bg-brand-primary hover:bg-brand-primary/80"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Fulfill Request
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="fulfilled" className="space-y-4">
            {fulfilledRequests.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Fulfilled Requests Yet</h3>
                  <p className="text-gray-400">
                    Fulfilled video requests will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              fulfilledRequests.map((request: VideoRequest) => (
                <Card key={request.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                          </div>
                          <div>
                            <h3 className="text-white font-semibold">{request.rewardName}</h3>
                            <p className="text-sm text-gray-400">
                              For <span className="text-brand-primary">@{request.fanUsername}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span>Fulfilled {formatDistanceToNow(new Date(request.fulfilledAt!), { addSuffix: true })}</span>
                        </div>
                      </div>

                      <Badge variant="outline" className="border-green-500/30 text-green-400">
                        Completed
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Fulfill Modal */}
        <Dialog open={fulfillModalOpen} onOpenChange={setFulfillModalOpen}>
          <DialogContent className="max-w-2xl bg-brand-dark-bg border-white/10 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Fulfill Video Request</DialogTitle>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-6">
                {/* Request Details */}
                <div className="p-4 bg-white/5 rounded-lg space-y-3">
                  <div>
                    <p className="text-xs text-gray-400">Fan</p>
                    <p className="text-white font-medium">@{selectedRequest.fanUsername}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Reward</p>
                    <p className="text-white font-medium">{selectedRequest.rewardName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Personalization Message</p>
                    <p className="text-white">{selectedRequest.personalizationMessage}</p>
                  </div>
                </div>

                {/* Video Upload */}
                <div className="space-y-3">
                  <h3 className="text-white font-semibold">Upload Custom Video</h3>
                  <Alert className="bg-blue-500/10 border-blue-500/20">
                    <AlertDescription className="text-gray-300 text-sm">
                      Record or upload your personalized video message. You can record directly on your mobile device.
                    </AlertDescription>
                  </Alert>

                  <VideoUpload
                    type="reward-video"
                    redemptionId={selectedRequest.id}
                    onUploadSuccess={(url) => {
                      setUploadedVideoUrl(url);
                      toast({
                        title: "Video Uploaded",
                        description: "Ready to send to the fan!",
                      });
                    }}
                    maxSizeMB={100}
                    label="Record or Upload Video"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFulfillModalOpen(false);
                      setSelectedRequest(null);
                      setUploadedVideoUrl('');
                    }}
                    className="flex-1 border-white/20 text-white"
                    disabled={fulfillMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitVideo}
                    disabled={!uploadedVideoUrl || fulfillMutation.isPending}
                    className="flex-1 bg-brand-primary hover:bg-brand-primary/80"
                  >
                    {fulfillMutation.isPending ? "Sending..." : "Send Video to Fan"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

