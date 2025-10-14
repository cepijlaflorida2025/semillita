import { useCallback, useRef, useState } from "react";

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreamActive(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Permission denied');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found');
        } else if (err.name === 'NotSupportedError') {
          setError('Camera not supported');
        } else {
          setError('Camera access failed');
        }
      } else {
        setError('Unknown camera error');
      }
      
      setIsStreamActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsStreamActive(false);
  }, []);

  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current || !isStreamActive) {
      return null;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      return null;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64 image data
    return canvas.toDataURL('image/jpeg', 0.9);
  }, [isStreamActive]);

  const switchCamera = useCallback(async () => {
    if (!isStreamActive) return;
    
    stopCamera();
    
    try {
      // Try to switch between front and back camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: streamRef.current?.getVideoTracks()[0]?.getSettings()?.facingMode === 'user' 
            ? 'environment' 
            : 'user'
        }
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreamActive(true);
      }
    } catch (err) {
      console.error('Error switching camera:', err);
      // Fallback to original camera
      startCamera();
    }
  }, [isStreamActive, startCamera]);

  return {
    videoRef,
    canvasRef,
    isStreamActive,
    error,
    startCamera,
    stopCamera,
    capturePhoto,
    switchCamera,
  };
}
