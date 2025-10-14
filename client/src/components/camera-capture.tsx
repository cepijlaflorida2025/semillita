import { useState, useRef, useEffect } from "react";
import { Camera, X, RotateCcw, Check, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCamera } from "@/hooks/use-camera";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    videoRef,
    canvasRef,
    isStreamActive,
    error,
    startCamera,
    stopCamera,
    capturePhoto,
  } = useCamera();

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const handleCapture = async () => {
    setIsCapturing(true);
    try {
      const imageData = capturePhoto();
      if (imageData) {
        setCapturedImage(imageData);
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleConfirm = () => {
    if (capturedImage) {
      // Convert base64 to File
      fetch(capturedImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'plant-photo.jpg', { type: 'image/jpeg' });
          onCapture(file);
        });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onCapture(file);
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">No se puede acceder a la cámara</h3>
            <p className="text-muted-foreground mb-6">
              {error === 'Permission denied' 
                ? 'Necesitas dar permiso para usar la cámara'
                : 'Hubo un problema al acceder a la cámara'}
            </p>
            
            {/* File Upload Alternative */}
            <div className="space-y-3">
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
                data-testid="button-upload-file"
              >
                <Upload className="w-4 h-4 mr-2" />
                Subir desde galería
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="w-full"
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="flex items-center justify-between">
          <Button
            size="icon"
            variant="ghost"
            className="text-white hover:bg-white/20"
            onClick={onClose}
            data-testid="button-close-camera"
          >
            <X className="w-6 h-6" />
          </Button>
          <h1 className="text-white font-semibold">Tomar foto</h1>
          <Button
            size="icon"
            variant="ghost"
            className="text-white hover:bg-white/20"
            onClick={() => fileInputRef.current?.click()}
            data-testid="button-upload-alternative"
          >
            <Upload className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Camera Preview or Captured Image */}
      <div className="relative w-full h-full">
        {capturedImage ? (
          <img
            src={capturedImage}
            alt="Captured"
            className="w-full h-full object-cover"
            data-testid="img-captured-preview"
          />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              data-testid="video-preview"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Camera Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="w-full h-full border-2 border-white/30 rounded-lg m-4" style={{ 
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.3)' 
              }} />
            </div>
          </>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6">
        {capturedImage ? (
          <div className="flex justify-center space-x-4">
            <Button
              size="icon"
              variant="outline"
              className="w-14 h-14 rounded-full bg-white/20 text-white border-white/30"
              onClick={handleRetake}
              data-testid="button-retake"
            >
              <RotateCcw className="w-6 h-6" />
            </Button>
            <Button
              size="icon"
              className="w-14 h-14 rounded-full"
              onClick={handleConfirm}
              data-testid="button-confirm"
            >
              <Check className="w-6 h-6" />
            </Button>
          </div>
        ) : (
          <div className="flex justify-center">
            <Button
              size="icon"
              className="w-20 h-20 rounded-full bg-white text-black hover:bg-white/90"
              onClick={handleCapture}
              disabled={!isStreamActive || isCapturing}
              data-testid="button-capture"
            >
              {isCapturing ? (
                <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-8 h-8" />
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Hidden file input for gallery upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
}
