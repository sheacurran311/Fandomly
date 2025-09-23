import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useInstagramConnection } from '@/contexts/instagram-connection-context';
import { toast } from '@/hooks/use-toast';
import { MessageCircle, Send, Loader2 } from 'lucide-react';

export default function InstagramMessageTest() {
  const { isConnected, userInfo, sendMessage } = useInstagramConnection();
  const [recipientId, setRecipientId] = useState('');
  const [message, setMessage] = useState('Hello World TESTER');
  const [sending, setSending] = useState(false);

  const handleSendMessage = async () => {
    if (!recipientId.trim() || !message.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both recipient ID and message",
        variant: "destructive"
      });
      return;
    }

    setSending(true);
    try {
      const success = await sendMessage(recipientId, message);
      if (success) {
        setMessage(''); // Clear message on success
      }
    } catch (error) {
      console.error('Message test error:', error);
    } finally {
      setSending(false);
    }
  };

  if (!isConnected) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-pink-500" />
            Instagram Messaging Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Please connect your Instagram Business Account first to test messaging.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-pink-500" />
          Instagram Messaging Test
        </CardTitle>
        {userInfo && (
          <p className="text-sm text-muted-foreground">
            Connected as @{userInfo.username}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Recipient ID</label>
          <Input
            placeholder="Enter Instagram user ID"
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Note: You can only message users who have messaged you first or are following your business account
          </p>
        </div>

        <div>
          <label className="text-sm font-medium">Message</label>
          <Input
            placeholder="Enter your message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-1"
          />
        </div>

        <Button 
          onClick={handleSendMessage}
          disabled={sending || !recipientId.trim() || !message.trim()}
          className="w-full"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Send Test Message
        </Button>

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Testing Notes:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Instagram has strict messaging policies</li>
            <li>You can only message users within 24 hours of their last message to you</li>
            <li>Or users who follow your business account</li>
            <li>Use this for testing with your own accounts first</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
