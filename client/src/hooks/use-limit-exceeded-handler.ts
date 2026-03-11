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
        const info = detail.details || {};
        const labelMap: Record<string, string> = {
          socialConnections: 'social connections',
          tasks: 'tasks',
          campaigns: 'campaigns',
          programs: 'loyalty programs',
        };
        const limitLabel = labelMap[info.limitType] || 'items';
        const tierName = info.tier || 'free';
        const max = info.max;
        toast({
          title: 'Plan Limit Reached',
          description: max
            ? `You\u2019ve used all ${max} ${limitLabel} included in your ${tierName} plan. Upgrade your subscription to unlock more.`
            : detail.message || 'You\u2019ve reached your plan limit. Upgrade to continue.',
          variant: 'destructive',
        });
      }
    };

    window.addEventListener('api-error', handler);
    return () => window.removeEventListener('api-error', handler);
  }, [toast]);
}
