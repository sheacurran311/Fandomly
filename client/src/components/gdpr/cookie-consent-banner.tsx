import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { Shield, ChevronDown, ChevronUp } from 'lucide-react';

const CONSENT_STORAGE_KEY = 'fandomly_cookie_consent';

interface ConsentState {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  version: string;
  savedAt: string;
}

const DEFAULT_CONSENT: ConsentState = {
  necessary: true,
  analytics: false,
  marketing: false,
  version: '1.0',
  savedAt: '',
};

export default function CookieConsentBanner() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(() => {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    return !stored;
  });
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState<ConsentState>(() => {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as ConsentState;
      } catch {
        return DEFAULT_CONSENT;
      }
    }
    return DEFAULT_CONSENT;
  });

  const saveConsent = useCallback(
    async (state: ConsentState) => {
      const finalState = { ...state, savedAt: new Date().toISOString() };
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(finalState));
      setConsent(finalState);
      setVisible(false);

      // Persist to server if user is authenticated
      if (user) {
        try {
          await apiRequest('PUT', '/api/gdpr/consents', {
            consentType: 'analytics',
            isGranted: state.analytics,
            version: state.version,
          });
          await apiRequest('PUT', '/api/gdpr/consents', {
            consentType: 'marketing',
            isGranted: state.marketing,
            version: state.version,
          });
        } catch {
          // Non-blocking — localStorage is the primary store for consent banner
        }
      }
    },
    [user]
  );

  const handleAcceptAll = () => {
    saveConsent({ ...consent, analytics: true, marketing: true });
  };

  const handleRejectAll = () => {
    saveConsent({ ...DEFAULT_CONSENT });
  };

  const handleSavePreferences = () => {
    saveConsent(consent);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="max-w-2xl mx-auto bg-gray-900 border border-white/10 rounded-xl shadow-2xl">
        <div className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-brand-primary/15 shrink-0">
              <Shield className="h-5 w-5 text-brand-primary" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-base">Cookie Preferences</h3>
              <p className="text-gray-400 text-sm mt-1">
                We use cookies to improve your experience. Select your preferences below. Necessary
                cookies are always enabled for core functionality.
              </p>
            </div>
          </div>

          {/* Expandable category details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1.5 text-sm text-brand-primary hover:text-brand-primary/80 mb-3"
          >
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showDetails ? 'Hide details' : 'Customize preferences'}
          </button>

          {showDetails && (
            <div className="space-y-3 mb-4 p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">Necessary</p>
                  <p className="text-gray-500 text-xs">
                    Required for the site to function. Cannot be disabled.
                  </p>
                </div>
                <Switch checked disabled className="opacity-50" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">Analytics</p>
                  <p className="text-gray-500 text-xs">Help us understand how you use our site.</p>
                </div>
                <Switch
                  checked={consent.analytics}
                  onCheckedChange={(checked) =>
                    setConsent((prev) => ({ ...prev, analytics: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">Marketing</p>
                  <p className="text-gray-500 text-xs">
                    Personalized content based on your interests.
                  </p>
                </div>
                <Switch
                  checked={consent.marketing}
                  onCheckedChange={(checked) =>
                    setConsent((prev) => ({ ...prev, marketing: checked }))
                  }
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleAcceptAll}
              className="bg-brand-primary hover:bg-brand-primary/90 text-white text-sm"
              size="sm"
            >
              Accept All
            </Button>
            <Button
              onClick={handleRejectAll}
              variant="outline"
              className="border-white/20 text-gray-300 hover:bg-white/10 text-sm"
              size="sm"
            >
              Reject All
            </Button>
            {showDetails && (
              <Button
                onClick={handleSavePreferences}
                variant="outline"
                className="border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10 text-sm"
                size="sm"
              >
                Save Preferences
              </Button>
            )}
          </div>

          <div className="mt-3 flex gap-3 text-xs text-gray-500">
            <a href="/privacy-policy" className="hover:text-gray-300 underline">
              Privacy Policy
            </a>
            <a href="/terms-of-service" className="hover:text-gray-300 underline">
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
