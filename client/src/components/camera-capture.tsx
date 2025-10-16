import { useState, useRef, useEffect } from "react";
import { Camera, X, RotateCcw, Check, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCamera } from "@/hooks/use-camera";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

/**
 * Reescala una imagen a 360p (480x360 o proporcional) para optimizar almacenamiento
 * @param file - Archivo de imagen original
 * @returns Promise con el archivo reescalado
 */
async function resizeImageTo360p(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('No se pudo obtener contexto del canvas'));
      return;
    }

    img.onload = () => {
      // Calcular dimensiones para 360p manteniendo aspect ratio
      const MAX_HEIGHT = 360;
      let width = img.width;
      let height = img.height;

      // Si la altura es mayor a 360p, reescalar proporcionalmente
      if (height > MAX_HEIGHT) {
        width = Math.round((width * MAX_HEIGHT) / height);
        height = MAX_HEIGHT;
      }

      // Establecer dimensiones del canvas
      canvas.width = width;
      canvas.height = height;

      // Dibujar imagen reescalada
      ctx.drawImage(img, 0, 0, width, height);

      // Convertir canvas a blob con calidad optimizada
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(resizedFile);
          } else {
            reject(new Error('Error al convertir canvas a blob'));
          }
        },
        'image/jpeg',
        0.85 // Calidad 85% para balance entre tamaño y calidad
      );
    };

    img.onerror = () => {
      reject(new Error('Error al cargar la imagen'));
    };

    // Cargar imagen desde File
    img.src = URL.createObjectURL(file);
  });
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

  const handleConfirm = async () => {
    if (capturedImage) {
      try {
        // Convert base64 to File
        const res = await fetch(capturedImage);
        const blob = await res.blob();
        const file = new File([blob], 'plant-photo.jpg', { type: 'image/jpeg' });

        // Reescalar imagen a 360p antes de enviar
        const resizedFile = await resizeImageTo360p(file);
        console.log(`Imagen reescalada: ${file.size} bytes -> ${resizedFile.size} bytes`);

        onCapture(resizedFile);
      } catch (error) {
        console.error('Error al procesar imagen:', error);
        // En caso de error, usar imagen original
        const res = await fetch(capturedImage);
        const blob = await res.blob();
        const file = new File([blob], 'plant-photo.jpg', { type: 'image/jpeg' });
        onCapture(file);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      try {
        // Reescalar imagen a 360p antes de enviar
        const resizedFile = await resizeImageTo360p(file);
        console.log(`Imagen desde galería reescalada: ${file.size} bytes -> ${resizedFile.size} bytes`);
        onCapture(resizedFile);
      } catch (error) {
        console.error('Error al reescalar imagen desde galería:', error);
        // En caso de error, usar imagen original
        onCapture(file);
      }
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
