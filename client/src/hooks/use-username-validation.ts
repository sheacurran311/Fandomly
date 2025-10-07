import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface UsernameValidationResult {
  available: boolean;
  username: string;
  error?: string;
  suggestions?: string[];
}

export function useUsernameValidation(username: string, debounceMs: number = 500) {
  const [debouncedUsername, setDebouncedUsername] = useState(username);

  // Debounce the username input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUsername(username);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [username, debounceMs]);

  // Query to check username availability
  const { data: validationResult, isLoading, error } = useQuery<UsernameValidationResult>({
    queryKey: ['username-validation', debouncedUsername],
    queryFn: async (): Promise<UsernameValidationResult> => {
      if (!debouncedUsername || debouncedUsername.length < 3) {
        return {
          available: false,
          username: debouncedUsername,
          error: 'Username must be at least 3 characters'
        };
      }

      const response = await fetch(`/api/auth/check-username/${encodeURIComponent(debouncedUsername)}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to check username');
      }
      
      return result;
    },
    enabled: debouncedUsername.length >= 3,
    staleTime: 30000, // Cache for 30 seconds
    retry: 1
  });

  return {
    isChecking: isLoading,
    isAvailable: validationResult?.available ?? false,
    error: error?.message || validationResult?.error,
    suggestions: validationResult?.suggestions || [],
    hasChecked: !!validationResult && debouncedUsername.length >= 3
  };
}

export default useUsernameValidation;
