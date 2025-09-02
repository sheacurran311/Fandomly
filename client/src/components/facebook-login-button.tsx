import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { FacebookSDK } from '@/lib/facebook';

interface FacebookLoginButtonProps {
  scope?: string;
  onSuccess?: (response: any) => void;
  onError?: (error: string) => void;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  text?: string;
}

export function FacebookLoginButton({
  scope = 'public_profile,email,pages_show_list,pages_read_engagement',
  onSuccess,
  onError,
  className = '',
  size = 'medium',
  text = 'Continue with Facebook'
}: FacebookLoginButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const initButton = async () => {
      try {
        await FacebookSDK.waitForSDK();
        setIsReady(true);
        
        if (buttonRef.current) {
          // Clear any existing content
          buttonRef.current.innerHTML = '';
          
          // Create Facebook login button element
          const fbButton = document.createElement('fb:login-button');
          fbButton.setAttribute('scope', scope);
          fbButton.setAttribute('onlogin', 'checkLoginState');
          fbButton.setAttribute('size', size);
          if (text) {
            fbButton.setAttribute('data-button-type', 'continue_with');
          }
          
          buttonRef.current.appendChild(fbButton);
          
          // Define the global callback function
          (window as any).checkLoginState = () => {
            window.FB.getLoginStatus((response: any) => {
              statusChangeCallback(response);
            });
          };
          
          // Parse the XFBML to render the button
          if (window.FB && (window.FB as any).XFBML) {
            (window.FB as any).XFBML.parse(buttonRef.current);
          }
        }
      } catch (error) {
        console.error('Error initializing Facebook login button:', error);
        onError?.('Failed to initialize Facebook login');
      }
    };

    initButton();
  }, [scope, size, text, onError]);

  const statusChangeCallback = (response: any) => {
    console.log('Facebook login status change:', response);
    
    if (response.status === 'connected') {
      // User is logged into Facebook and has authorized the app
      toast({
        title: "Facebook Connected",
        description: "Successfully connected to Facebook!",
      });
      onSuccess?.(response);
    } else if (response.status === 'not_authorized') {
      // User is logged into Facebook but hasn't authorized the app
      toast({
        title: "Authorization Required",
        description: "Please authorize the app to continue",
        variant: "destructive",
      });
      onError?.('User did not authorize the application');
    } else {
      // User is not logged into Facebook
      toast({
        title: "Facebook Login Required",
        description: "Please log into Facebook to continue",
        variant: "destructive",
      });
      onError?.('User is not logged into Facebook');
    }
  };

  if (!isReady) {
    return (
      <div className={`inline-block ${className}`}>
        <div className="bg-blue-600 text-white px-4 py-2 rounded-lg animate-pulse">
          Loading Facebook...
        </div>
      </div>
    );
  }

  return (
    <div className={`facebook-login-container ${className}`}>
      <div 
        ref={buttonRef} 
        className="fb-login-button-wrapper"
        data-testid="facebook-login-button"
      />
    </div>
  );
}

export default FacebookLoginButton;