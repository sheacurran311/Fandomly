import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useInstagramConnection } from '@/contexts/instagram-connection-context';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import { fetchApi } from '@/lib/queryClient';
import { 
  Webhook, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  Settings,
  MessageCircle,
  Heart,
  MessageSquare
} from 'lucide-react';

interface WebhookStatus {
  subscribed: boolean;
  fields: string[];
  loading: boolean;
  error: string | null;
}

export default function InstagramWebhookSetup() {
  const { user } = useAuth();
  const { isConnected, userInfo, accessToken } = useInstagramConnection();
  const initCheckRef = useRef<string | null>(null);
  const checkingRef = useRef(false);
  const lastCheckTsRef = useRef<number>(0);
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus>({
    subscribed: false,
    fields: [],
    loading: false,
    error: null
  });

  // Only show for creators with connected Instagram
  if (user?.userType !== 'creator' || !isConnected || !userInfo) {
    return null;
  }

  const webhookFields = [
    { name: 'messages', label: 'Messages', icon: MessageCircle, description: 'Receive incoming messages from users' },
    { name: 'message_reactions', label: 'Message Reactions', icon: Heart, description: 'Get notified when users react to messages' },
    { name: 'comments', label: 'Comments', icon: MessageSquare, description: 'Monitor comments on your posts' }
  ];

  const checkWebhookStatus = async () => {
    if (!accessToken || !userInfo?.id) return;
    if (checkingRef.current) return;
    const now = Date.now();
    if (now - lastCheckTsRef.current < 30000) return; // throttle to 30s to avoid loops

    checkingRef.current = true;
    lastCheckTsRef.current = now;
    setWebhookStatus(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await fetchApi(`/api/instagram/webhook-status?access_token=${accessToken}&instagram_account_id=${userInfo.id}`);
      setWebhookStatus(prev => ({
        ...prev,
        subscribed: data.data && data.data.length > 0,
        fields: data.data ? data.data.map((item: any) => item.subscribed_fields).flat() : [],
        loading: false
      }));
    } catch (error: any) {
      const msg = (error?.message as string) || 'Failed to check webhook status';
      // Handle rate limit gracefully
      if (msg.includes('429') || msg.toLowerCase().includes('rate')) {
        toast({ title: 'Rate Limited', description: 'Too many requests. Cooling down for 2 minutes.' });
        lastCheckTsRef.current = Date.now() + 120000; // backoff 120s
      }
      console.error('[Instagram Webhooks] Status check error:', error);
      setWebhookStatus(prev => ({ ...prev, loading: false, error: msg }));
    } finally {
      checkingRef.current = false;
    }
  };

  const subscribeToWebhooks = async () => {
    if (!accessToken || !userInfo.id) return;

    setWebhookStatus(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await fetchApi('/api/instagram/subscribe-webhooks', {
        method: 'POST',
        body: JSON.stringify({
          access_token: accessToken,
          instagram_account_id: userInfo.id,
          fields: ['messages', 'message_reactions', 'comments']
        })
      });
      
      setWebhookStatus(prev => ({
        ...prev,
        subscribed: true,
        fields: result.fields,
        loading: false
      }));

      toast({
        title: "Webhooks Enabled! 🎉",
        description: "Successfully subscribed to Instagram webhooks for real-time messaging.",
        duration: 4000
      });

    } catch (error) {
      console.error('[Instagram Webhooks] Subscribe error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to subscribe to webhooks';
      
      setWebhookStatus(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));

      toast({
        title: "Webhook Setup Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  // Check webhook status on account change (one-shot per account id)
  useEffect(() => {
    if (!accessToken || !userInfo?.id) return;
    if (initCheckRef.current !== userInfo.id) {
      initCheckRef.current = userInfo.id;
      lastCheckTsRef.current = 0; // reset throttle for new account
      checkWebhookStatus();
    }
    // Do not auto check on every render; manual 'Refresh Status' button triggers checks
    // This avoids loops when tokens change or rate limits are hit
  }, [userInfo?.id]);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-blue-500" />
          Instagram Webhooks
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Enable real-time notifications for Instagram messaging and engagement
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Webhook Status */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            {webhookStatus.subscribed ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            )}
            <div>
              <p className="font-medium">
                {webhookStatus.subscribed ? 'Webhooks Active' : 'Webhooks Not Configured'}
              </p>
              <p className="text-sm text-muted-foreground">
                {webhookStatus.subscribed 
                  ? `Subscribed to ${webhookStatus.fields.length} webhook fields`
                  : 'Required for real-time messaging'
                }
              </p>
            </div>
          </div>
          {webhookStatus.subscribed && (
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              Active
            </Badge>
          )}
        </div>

        {/* Webhook Fields */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Webhook Fields:</h4>
          <div className="grid gap-2">
            {webhookFields.map(field => {
              const isSubscribed = webhookStatus.fields.includes(field.name);
              const Icon = field.icon;
              
              return (
                <div key={field.name} className="flex items-center justify-between p-2 rounded border">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">{field.label}</p>
                      <p className="text-xs text-muted-foreground">{field.description}</p>
                    </div>
                  </div>
                  {isSubscribed ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Display */}
        {webhookStatus.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{webhookStatus.error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!webhookStatus.subscribed ? (
            <Button 
              onClick={subscribeToWebhooks}
              disabled={webhookStatus.loading}
              className="flex-1"
            >
              {webhookStatus.loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Webhook className="h-4 w-4 mr-2" />
              )}
              Enable Webhooks
            </Button>
          ) : (
            <Button 
              variant="outline"
              onClick={checkWebhookStatus}
              disabled={webhookStatus.loading}
              className="flex-1"
            >
              {webhookStatus.loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Settings className="h-4 w-4 mr-2" />
              )}
              Refresh Status
            </Button>
          )}
        </div>

        {/* Setup Instructions */}
        {!webhookStatus.subscribed && (
          <div className="text-xs text-muted-foreground space-y-1 p-3 bg-blue-50 rounded-lg">
            <p><strong>Note:</strong> Webhooks are required for:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Receiving messages from users in real-time</li>
              <li>Getting notifications about message reactions</li>
              <li>Monitoring comments and mentions</li>
              <li>Enabling automated fan engagement</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
