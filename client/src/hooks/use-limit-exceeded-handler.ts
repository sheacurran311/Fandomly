import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

/**
 * Global listener for LIMIT_EXCEEDED API errors.
 * Shows a toast with the error message and an upgrade prompt.
 * Mount this once in your app (e.g., in App.tsx).
 */
export function useLimitExceededHandler() {
  const { toast } = useToast();

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.code === 'LIMIT_EXCEEDED') {
        toast({
          title: 'Plan Limit Reached',
          description: `${detail.message} Visit your Subscription page to upgrade.`,
          variant: 'destructive',
        });
      }
    };

    window.addEventListener('api-error', handler);
    return () => window.removeEventListener('api-error', handler);
  }, [toast]);
}
