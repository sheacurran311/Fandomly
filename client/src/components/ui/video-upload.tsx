import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, Video, X, Play, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VideoUploadProps {
  onUploadSuccess: (url: string, filename: string) => void;
  onRemove?: () => void;
  currentVideoUrl?: string;
  type?: 'video' | 'reward-video';
  redemptionId?: string;
  maxSizeMB?: number;
  acceptedFormats?: string[];
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function VideoUpload({
  onUploadSuccess,
  onRemove,
  currentVideoUrl,
  type = 'video',
  redemptionId,
  maxSizeMB = 100,
  acceptedFormats = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
  label = "Upload Video",
  disabled = false,
  className = ""
}: VideoUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentVideoUrl || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!acceptedFormats.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: `Please upload a video file. Accepted formats: ${acceptedFormats.map(f => f.split('/')[1]).join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      toast({
        title: "File Too Large",
        description: `Video must be smaller than ${maxSizeMB}MB. Your file is ${fileSizeMB.toFixed(2)}MB.`,
        variant: "destructive",
      });
      return;
    }

    // Create preview URL
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', selectedFile);
      if (redemptionId) {
        formData.append('redemptionId', redemptionId);
      }

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setProgress(Math.round(percentComplete));
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          onUploadSuccess(response.url, response.filename);
          toast({
            title: "Video Uploaded Successfully",
            description: "Your video has been uploaded.",
          });
          setSelectedFile(null);
        } else {
          throw new Error('Upload failed');
        }
        setUploading(false);
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        toast({
          title: "Upload Failed",
          description: "Failed to upload video. Please try again.",
          variant: "destructive",
        });
        setUploading(false);
      });

      xhr.open('POST', `/api/upload/${type}`);
      xhr.send(formData);

    } catch (error) {
      console.error('Video upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload video",
        variant: "destructive",
      });
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onRemove?.();
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {label && <Label className="text-gray-300">{label}</Label>}
      
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
        capture="user" // Enable mobile camera capture
      />

      {!previewUrl ? (
        <div
          onClick={triggerFileSelect}
          className={`border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-brand-primary transition-colors ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-brand-primary/20 flex items-center justify-center">
              <Video className="h-8 w-8 text-brand-primary" />
            </div>
            <div>
              <p className="text-white font-medium">Click to upload video</p>
              <p className="text-sm text-gray-400 mt-1">
                Max size: {maxSizeMB}MB • Formats: MP4, WebM, MOV
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className="border-brand-primary text-brand-primary hover:bg-brand-primary/10"
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose Video
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Video Preview */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              src={previewUrl}
              controls
              className="w-full max-h-96 object-contain"
            />
            {!uploading && (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={handleRemove}
                className="absolute top-2 right-2"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Uploading...</span>
                <span className="text-brand-primary font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Upload Button */}
          {selectedFile && !uploading && !currentVideoUrl && (
            <Button
              type="button"
              onClick={handleUpload}
              disabled={disabled}
              className="w-full bg-brand-primary hover:bg-brand-primary/80"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Video
            </Button>
          )}

          {/* File Info */}
          {selectedFile && (
            <div className="text-xs text-gray-400">
              <p>File: {selectedFile.name}</p>
              <p>Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

