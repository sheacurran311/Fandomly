/**
 * Instagram Username Capture Modal
 * 
 * Prompts fans to save their Instagram username for task verification
 * One-time setup, username saved to database
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Instagram, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface InstagramUsernameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (username: string) => void;
  required?: boolean;
}

export function InstagramUsernameModal({
  open,
  onOpenChange,
  onSuccess,
  required = false
}: InstagramUsernameModalProps) {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      // Reset state when modal opens
      setUsername('');
      setError(null);
      setSuccess(false);
      
      // Check if username already saved
      checkExistingUsername();
    }
  }, [open]);

  async function checkExistingUsername() {
    try {
      const response = await fetch('/api/social/user/instagram', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.connected && data.username) {
          setUsername(data.username);
          setSuccess(true);
        }
      }
    } catch (err) {
      console.error('Error checking existing username:', err);
    }
  }

  function validateUsername(value: string): boolean {
    // Remove @ if user includes it
    const cleaned = value.replace(/^@/, '').trim();
    
    // Instagram username validation:
    // 1-30 characters, alphanumeric with periods/underscores
    // Cannot start or end with period
    const usernameRegex = /^[A-Za-z0-9._]{1,30}$/;
    
    if (!usernameRegex.test(cleaned)) {
      return false;
    }
    
    if (cleaned.startsWith('.') || cleaned.endsWith('.')) {
      return false;
    }
    
    return true;
  }

  function handleUsernameChange(value: string) {
    // Remove @ symbol if user types it
    const cleaned = value.replace(/^@/, '');
    setUsername(cleaned);
    setError(null);
  }

  async function handleSave() {
    if (!username.trim()) {
      setError('Please enter your Instagram username');
      return;
    }

    if (!validateUsername(username)) {
      setError('Invalid username format. Use only letters, numbers, periods, and underscores (1-30 characters)');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/social/user/instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: username.trim() })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save username');
      }

      const data = await response.json();
      setSuccess(true);
      
      // Wait a moment to show success message
      setTimeout(() => {
        onSuccess?.(data.username);
        if (!required) {
          onOpenChange(false);
        }
      }, 1500);

    } catch (err) {
      console.error('Error saving username:', err);
      setError(err instanceof Error ? err.message : 'Failed to save username');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={required ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500">
              <Instagram className="w-5 h-5 text-white" />
            </div>
            <DialogTitle>Connect Your Instagram</DialogTitle>
          </div>
          <DialogDescription>
            {success 
              ? "Your Instagram username has been saved!"
              : "Enter your Instagram username to participate in Instagram tasks. We'll use this to verify your task completions."}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6">
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-500">
                Successfully saved: <strong>@{username}</strong>
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="instagram-username">
                Instagram Username
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  @
                </span>
                <Input
                  id="instagram-username"
                  placeholder="yourusername"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  className="pl-8"
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSave();
                    }
                  }}
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500">
                Enter your username without the @ symbol
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-xs text-blue-400">
                <strong>Privacy note:</strong> We only use your username to match your Instagram activity for task verification. We don't access your DMs, followers, or private data.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {success ? (
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Done
            </Button>
          ) : (
            <>
              {!required && (
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={isLoading || !username.trim()}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save Username
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to check if Instagram username is saved
 */
export function useInstagramUsername() {
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  async function checkUsername() {
    try {
      const response = await fetch('/api/social/user/instagram', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.connected);
        setUsername(data.username);
      }
    } catch (err) {
      console.error('Error checking Instagram username:', err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    checkUsername();
  }, []);

  return {
    username,
    isConnected,
    isLoading,
    refresh: checkUsername
  };
}

