import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, Move, Crop } from "lucide-react";

interface ImageCropModalProps {
  isOpen: boolean;
  imageUrl: string;
  aspectRatio: number; // e.g., 1 for square (avatar), 4 for banner (4:1)
  onCropComplete: (croppedImageBlob: Blob) => void;
  onCancel: () => void;
  type: 'avatar' | 'banner';
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function ImageCropModal({
  isOpen,
  imageUrl,
  aspectRatio,
  onCropComplete,
  onCancel,
  type
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = useCallback((crop: { x: number; y: number }) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const onCropAreaComplete = useCallback((croppedArea: CropArea, croppedAreaPixels: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createCroppedImage = async (): Promise<Blob | null> => {
    if (!croppedAreaPixels) return null;

    try {
      const image = new Image();
      image.src = imageUrl;
      
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Set canvas size to match cropped area
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      // Draw the cropped image
      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      // Convert canvas to blob
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.95);
      });
    } catch (error) {
      console.error('Error creating cropped image:', error);
      return null;
    }
  };

  const handleCropConfirm = async () => {
    setIsProcessing(true);
    
    try {
      const croppedBlob = await createCroppedImage();
      
      if (croppedBlob) {
        onCropComplete(croppedBlob);
      } else {
        throw new Error('Failed to create cropped image');
      }
    } catch (error) {
      console.error('Crop error:', error);
      alert('Failed to crop image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const recommendedSize = type === 'avatar' 
    ? '400x400px (Square)' 
    : '1200x300px (Wide)';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-4xl bg-brand-dark border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Crop className="h-5 w-5" />
            Crop & Adjust {type === 'avatar' ? 'Profile Photo' : 'Banner'}
          </DialogTitle>
          <p className="text-gray-400 text-sm">
            Drag to reposition, use the slider to zoom. Recommended: {recommendedSize}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cropper */}
          <div className="relative w-full" style={{ height: '400px' }}>
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={onCropAreaComplete}
              style={{
                containerStyle: {
                  backgroundColor: '#000',
                  borderRadius: '0.5rem'
                }
              }}
            />
          </div>

          {/* Zoom Controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <ZoomOut className="h-4 w-4" />
                <span>Zoom</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{Math.round(zoom * 100)}%</span>
                <ZoomIn className="h-4 w-4" />
              </div>
            </div>
            <Slider
              value={[zoom]}
              onValueChange={(values) => setZoom(values[0])}
              min={1}
              max={3}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Instructions */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-400">
            <div className="flex items-start gap-2">
              <Move className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium mb-1">How to use:</p>
                <ul className="space-y-1 text-xs text-blue-300">
                  <li>• Drag the image to reposition</li>
                  <li>• Use the slider or scroll to zoom in/out</li>
                  <li>• The highlighted area is what will be used</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
            className="border-white/20 text-gray-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCropConfirm}
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isProcessing ? 'Processing...' : 'Apply Crop & Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
