import { useState, useEffect } from 'react';

interface SlugValidationResult {
  isChecking: boolean;
  isAvailable: boolean;
  error: string | null;
  suggestions: string[];
  hasChecked: boolean;
}

/**
 * Hook to validate creator slug availability
 * Similar to useUsernameValidation but for tenant slugs
 */
export default function useSlugValidation(slug: string): SlugValidationResult {
  const [debouncedSlug, setDebouncedSlug] = useState(slug);
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [hasChecked, setHasChecked] = useState(false);
  
  // Debounce the slug input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSlug(slug);
    }, 500);

    return () => clearTimeout(timer);
  }, [slug]);

  useEffect(() => {
    const checkSlugAvailability = async () => {
      // Don't check if slug is empty or too short
      if (!debouncedSlug || debouncedSlug.length < 3) {
        setIsChecking(false);
        setIsAvailable(false);
        setError(debouncedSlug.length > 0 && debouncedSlug.length < 3 
          ? 'Slug must be at least 3 characters' 
          : null);
        setHasChecked(debouncedSlug.length > 0);
        return;
      }

      // Validate slug format
      if (!/^[a-z0-9-]+$/.test(debouncedSlug)) {
        setIsChecking(false);
        setIsAvailable(false);
        setError('Slug can only contain lowercase letters, numbers, and hyphens');
        setHasChecked(true);
        return;
      }

      // Check if slug starts or ends with hyphen
      if (debouncedSlug.startsWith('-') || debouncedSlug.endsWith('-')) {
        setIsChecking(false);
        setIsAvailable(false);
        setError('Slug cannot start or end with a hyphen');
        setHasChecked(true);
        return;
      }

      setIsChecking(true);
      setError(null);

      try {
        const response = await fetch(`/api/tenants/check-slug/${encodeURIComponent(debouncedSlug)}`, {
          credentials: 'include',
        });
        
        const data = await response.json();

        if (response.ok) {
          setIsAvailable(data.available);
          setError(data.available ? null : 'This slug is already taken');
          setSuggestions(data.suggestions || []);
        } else {
          setIsAvailable(false);
          setError(data.error || 'Failed to check slug availability');
          setSuggestions([]);
        }
      } catch (err) {
        console.error('Error checking slug availability:', err);
        setIsAvailable(false);
        setError('Failed to check slug availability');
        setSuggestions([]);
      } finally {
        setIsChecking(false);
        setHasChecked(true);
      }
    };

    checkSlugAvailability();
  }, [debouncedSlug]);

  return {
    isChecking,
    isAvailable,
    error,
    suggestions,
    hasChecked,
  };
}

