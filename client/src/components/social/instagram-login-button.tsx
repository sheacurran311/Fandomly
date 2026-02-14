import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Instagram, Loader2 } from 'lucide-react';
import InstagramSDKManager from '@/lib/instagram';

interface InstagramLoginButtonProps {
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
  className?: string;
  size?: 'sm' | 'medium' | 'lg';
  text?: string;
  disabled?: boolean;
  loading?: boolean;
  userType?: 'creator' | 'fan';
}

export function InstagramLoginButton({
  onSuccess,
  onError,
  className = '',
  size = 'medium',
  text = 'Connect with Instagram',
  disabled = false,
  loading: externalLoading = false,
  userType = 'creator'
}: InstagramLoginButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const loading = externalLoading || isConnecting;

  const handleClick = async () => {
    if (disabled || loading) return;

    try {
      setIsConnecting(true);
      // Instagram only supports creator/business auth -- always use 'creator'
      const result = await InstagramSDKManager.secureLogin('creator');
      
      if (result.success) {
        onSuccess?.(result);
      } else {
        onError?.(result.error || 'Failed to connect Instagram');
      }
    } catch (error) {
      console.error('[Instagram Login Button] Error:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to initiate Instagram login');
    } finally {
      setIsConnecting(false);
    }
  };

  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    medium: 'h-10 px-4',
    lg: 'h-12 px-6 text-lg'
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || loading}
      className={`bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white border-0 ${sizeClasses[size]} ${className}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Instagram className="h-4 w-4 mr-2" />
      )}
      {text}
    </Button>
  );
}
