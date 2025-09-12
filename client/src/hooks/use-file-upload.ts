import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from './use-toast';

interface UploadOptions {
  maxSize?: number; // in MB
  allowedTypes?: string[];
  onSuccess?: (url: string) => void;
  onError?: (error: string) => void;
}

interface UploadResponse {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

const DEFAULT_MAX_SIZE = 5; // 5MB
const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

export const useFileUpload = (options: UploadOptions = {}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();
  
  const {
    maxSize = DEFAULT_MAX_SIZE,
    allowedTypes = DEFAULT_ALLOWED_TYPES,
    onSuccess,
    onError
  } = options;

  const uploadMutation = useMutation({
    mutationFn: async (file: File): Promise<UploadResponse> => {
      // Validate file size
      if (file.size > maxSize * 1024 * 1024) {
        throw new Error(`File size must be less than ${maxSize}MB`);
      }

      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type header - let browser set it with boundary for FormData
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Upload successful! ✅",
        description: `File uploaded: ${data.fileName}`,
      });
      onSuccess?.(data.url);
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      toast({
        title: "Upload failed ❌",
        description: errorMessage,
        variant: "destructive",
      });
      onError?.(errorMessage);
    }
  });

  const handleFileSelect = (file: File) => {
    // Create preview URL for images
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      // Clean up preview URL when component unmounts or new file is selected
      return () => URL.revokeObjectURL(url);
    }
    
    // Start upload
    uploadMutation.mutate(file);
  };

  const clearPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  return {
    upload: uploadMutation.mutate,
    isUploading: uploadMutation.isPending,
    error: uploadMutation.error,
    handleFileSelect,
    previewUrl,
    clearPreview,
    reset: () => {
      uploadMutation.reset();
      clearPreview();
    }
  };
};

// Specialized hooks for common use cases
export const useImageUpload = (onSuccess?: (url: string) => void) => {
  return useFileUpload({
    maxSize: 5,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    onSuccess
  });
};

export const useAvatarUpload = (onSuccess?: (url: string) => void) => {
  return useFileUpload({
    maxSize: 2,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
    onSuccess
  });
};

export const useBrandingUpload = (onSuccess?: (url: string) => void) => {
  return useFileUpload({
    maxSize: 10,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    onSuccess
  });
};
