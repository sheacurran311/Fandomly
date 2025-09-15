import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Facebook, User, CheckCircle, AlertCircle, Unlink, Plus } from "lucide-react";
import { useFanFacebookConnection } from "@/contexts/fan-facebook-context";

export default function FanFacebookConnect() {
  const { 
    isConnected,
    isConnecting,
    userInfo,
    connectFacebook,
    disconnectFacebook,
  } = useFanFacebookConnection();

  return (
    <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
      <CardHeader>
        <CardTitle className="text-white text-sm flex items-center">
          <Facebook className="h-4 w-4 mr-2 text-blue-500" />
          Facebook Connect
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected && userInfo ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{userInfo.name}</p>
                <p className="text-xs text-gray-400">Connected to Facebook</p>
              </div>
              <Badge className="bg-green-500/20 text-green-400 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            </div>
            
            <div className="pt-2 border-t border-white/10">
              <p className="text-xs text-gray-400 mb-2">Ready to participate in Facebook campaigns!</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-white/20 text-gray-300 hover:bg-white/10"
                onClick={disconnectFacebook}
                data-testid="button-disconnect-facebook-fan"
              >
                <Unlink className="h-4 w-4 mr-1" />
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Facebook className="h-6 w-6 text-blue-500" />
              </div>
              <p className="text-sm text-white font-medium mb-1">Connect Facebook</p>
              <p className="text-xs text-gray-400">Join campaigns and earn rewards</p>
            </div>
            
            <Button 
              className="w-full bg-brand-primary hover:bg-brand-primary/80"
              onClick={connectFacebook}
              disabled={isConnecting}
              data-testid="button-connect-facebook-fan"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isConnecting ? 'Connecting...' : 'Connect Facebook'}
            </Button>
            
            <p className="text-xs text-gray-500 text-center">
              Connect to participate in creator campaigns and earn points
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}