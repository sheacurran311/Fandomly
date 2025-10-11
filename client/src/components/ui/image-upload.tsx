import { useState, useRef, useCallback } from "react";
import { Upload, X, Loader2, Image as ImageIcon, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getDynamicUserId } from "@/lib/queryClient";
import { ImageCropModal } from "@/components/ui/image-crop-modal";
import { transformImageUrl } from "@/lib/image-utils";

interface ImageUploadProps {
  type: 'avatar' | 'banner';
  currentImageUrl?: string;
  onUploadSuccess: (url: string) => void;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
}

export function ImageUpload({
  type,
  currentImageUrl,
  onUploadSuccess,
  onRemove,
  disabled = false,
  className = ""
}: ImageUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToUpload, setImageToUpload] = useState<File | null>(null);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);

  const isAvatar = type === 'avatar';
  const isBanner = type === 'banner';

  // Recommended dimensions
  const recommendedDimensions = isAvatar
    ? "400x400px (1:1 ratio)"
    : "1200x300px (4:1 ratio)";

  const maxSize = 5; // MB

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Please upload a JPEG, PNG, or WebP image' };
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      return { valid: false, error: `File size must be less than ${maxSize}MB` };
    }

    return { valid: true };
  };

  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      toast({
        title: "Invalid File",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    // Create preview and open crop modal
    const preview = URL.createObjectURL(file);
    setTempImageUrl(preview);
    setImageToUpload(file);
    setShowCropModal(true);
  }, [toast]);

  const handleCropComplete = useCallback(async (croppedBlob: Blob) => {
    setShowCropModal(false);
    
    // Create a File object from the blob
    const croppedFile = new File([croppedBlob], imageToUpload?.name || 'cropped-image.jpg', {
      type: 'image/jpeg'
    });

    // Create preview of cropped image
    const preview = URL.createObjectURL(croppedBlob);
    setPreviewUrl(preview);

    // Upload file
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('image', croppedFile);

      const endpoint = `/api/upload/${type}`;
      
      // Simulate progress (real progress tracking would require XHR)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Get Dynamic user ID for authentication
      const dynamicUserId = getDynamicUserId();
      
      if (!dynamicUserId) {
        throw new Error('Please log in to upload images');
      }
      
      const headers: HeadersInit = {
        'x-dynamic-user-id': dynamicUserId
      };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();

      toast({
        title: "Upload Successful",
        description: `Your ${type} has been uploaded successfully!`,
      });

      onUploadSuccess(data.url);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : 'Failed to upload image',
        variant: "destructive"
      });
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setTempImageUrl(null);
      setImageToUpload(null);
    }
  }, [type, toast, onUploadSuccess, imageToUpload]);

  const handleCropCancel = useCallback(() => {
    setShowCropModal(false);
    setTempImageUrl(null);
    setImageToUpload(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled || isUploading) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [disabled, isUploading, handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  }, [disabled, isUploading]);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onRemove?.();
  };

  // Transform image URL to use our proxy for Replit storage images
  const transformedImageUrl = transformImageUrl(currentImageUrl);
  const displayUrl = previewUrl || transformedImageUrl;
  const aspectRatio = isAvatar ? 1 : 4; // 1:1 for avatar, 4:1 for banner

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Image Crop Modal */}
      {showCropModal && tempImageUrl && (
        <ImageCropModal
          isOpen={showCropModal}
          imageUrl={tempImageUrl}
          aspectRatio={aspectRatio}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          type={type}
        />
      )}
      <div
        className={`
          relative border-2 border-dashed rounded-lg transition-all
          ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-white/20'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-white/40'}
          ${isUploading ? 'pointer-events-none' : ''}
          ${isAvatar ? 'aspect-square max-w-xs mx-auto' : 'aspect-[4/1]'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || isUploading}
        />

        {displayUrl ? (
          <div className="relative w-full h-full group">
            <img
              src={displayUrl}
              alt={`${type} preview`}
              className={`w-full h-full object-cover rounded-lg ${isAvatar ? '' : ''}`}
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                disabled={disabled || isUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Change
              </Button>
              {onRemove && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                  className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                  disabled={disabled || isUploading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              )}
            </div>
            {isUploading && (
              <div className="absolute inset-0 bg-black/70 rounded-lg flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 text-white animate-spin mb-2" />
                <p className="text-white text-sm">Uploading... {uploadProgress}%</p>
                <div className="w-2/3 h-2 bg-white/20 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            {isUploading ? (
              <>
                <Loader2 className="h-12 w-12 text-gray-400 animate-spin mb-3" />
                <p className="text-white font-medium">Uploading...</p>
                <p className="text-gray-400 text-sm">{uploadProgress}%</p>
              </>
            ) : (
              <>
                <ImageIcon className="h-12 w-12 text-gray-400 mb-3" />
                <p className="text-white font-medium mb-1">
                  {isDragging ? 'Drop image here' : `Upload ${type}`}
                </p>
                <p className="text-gray-400 text-sm mb-2">
                  Drag & drop or click to browse
                </p>
                <p className="text-gray-500 text-xs">
                  Recommended: {recommendedDimensions}
                </p>
                <p className="text-gray-500 text-xs">
                  JPG, PNG, or WebP • Max {maxSize}MB
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Helpful tips */}
      <div className="text-xs text-gray-400 space-y-1">
        {isAvatar && (
          <>
            <p>• Upload any image - you'll be able to crop it to a square</p>
            <p>• Minimum 50x50px, recommended 400x400px or larger</p>
          </>
        )}
        {isBanner && (
          <>
            <p>• Upload any image - you'll be able to crop it to a wide banner</p>
            <p>• Minimum 200x100px, recommended 1200x300px or larger</p>
          </>
        )}
      </div>
    </div>
  );
}
