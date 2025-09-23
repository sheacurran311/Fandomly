import React from 'react';
import { Button } from '@/components/ui/button';
import { Instagram, Loader2 } from 'lucide-react';

interface InstagramLoginButtonProps {
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
  className?: string;
  size?: 'sm' | 'medium' | 'lg';
  text?: string;
  disabled?: boolean;
  loading?: boolean;
}

export function InstagramLoginButton({
  onSuccess,
  onError,
  className = '',
  size = 'medium',
  text = 'Connect with Instagram',
  disabled = false,
  loading = false
}: InstagramLoginButtonProps) {
  const handleClick = () => {
    if (disabled || loading) return;

    try {
      // Use the exact URL from your Instagram App Dashboard
      const instagramAuthUrl = 'https://www.instagram.com/oauth/authorize?force_reauth=true&client_id=1157911489578561&redirect_uri=https://81905ce2-383a-4f34-a786-de23b33f10cb-00-3bmrhe6m2al7v.janeway.replit.dev/creator-dashboard&response_type=code&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish%2Cinstagram_business_manage_insights';
      
      // Redirect to Instagram OAuth
      window.location.href = instagramAuthUrl;
    } catch (error) {
      console.error('[Instagram Login Button] Error:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to initiate Instagram login');
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
