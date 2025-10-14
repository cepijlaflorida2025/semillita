import { useState, useRef, useEffect } from "react";
import { Mic, X, Play, Pause, Square, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface AudioRecorderProps {
  onCapture: (file: File) => void;
  onClose: () => void;
  maxDuration?: number; // in seconds
}

export default function AudioRecorder({ 
  onCapture, 
  onClose, 
  maxDuration = 30 
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm' // Fallback to supported format
      });
      
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start(1000); // Record in 1-second chunks
      setIsRecording(true);
      setDuration(0);
      
      // Start duration counter
      intervalRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('No se pudo acceder al micrófono');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setIsRecording(false);
    setIsPaused(false);
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      // Resume duration counter
      intervalRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  const playRecording = () => {
    if (audioBlob) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      
      const audioUrl = URL.createObjectURL(audioBlob);
      audioRef.current = new Audio(audioUrl);
      
      audioRef.current.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const pausePlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setDuration(0);
    setIsPlaying(false);
    setError(null);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const handleConfirm = () => {
    if (audioBlob) {
      const file = new File([audioBlob], 'voice-note.webm', { type: 'audio/webm' });
      onCapture(file);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = (duration / maxDuration) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Mic className="w-5 h-5 mr-2" />
              Grabar Nota de Voz
            </CardTitle>
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              data-testid="button-close-recorder"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mic className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="font-bold text-destructive mb-2">Error de Micrófono</h3>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          ) : (
            <>
              {/* Recording Visualization */}
              <div className="text-center py-8">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 transition-all ${
                  isRecording && !isPaused ? "bg-destructive/20" : "bg-primary/10"
                }`}>
                  <Mic className={`w-12 h-12 ${
                    isRecording && !isPaused ? "text-destructive animate-pulse" : "text-primary"
                  }`} />
                </div>
                
                <div className="text-2xl font-bold text-foreground mb-2">
                  {formatTime(duration)}
                </div>
                
                <Progress value={progressPercentage} className="w-full h-2 mb-2" />
                
                <p className="text-xs text-muted-foreground">
                  Máximo {maxDuration} segundos
                </p>
              </div>

              {/* Status Message */}
              <div className="text-center">
                {isRecording ? (
                  <p className="text-sm text-muted-foreground">
                    {isPaused ? 'Grabación pausada...' : 'Grabando... habla ahora'}
                  </p>
                ) : audioBlob ? (
                  <p className="text-sm text-muted-foreground">
                    Grabación lista. Puedes escucharla o grabar de nuevo.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Toca el botón rojo para empezar a grabar
                  </p>
                )}
              </div>

              {/* Controls */}
              <div className="flex justify-center space-x-4">
                {!audioBlob ? (
                  // Recording controls
                  <>
                    {!isRecording ? (
                      <Button
                        size="lg"
                        className="w-16 h-16 rounded-full bg-destructive hover:bg-destructive/90"
                        onClick={startRecording}
                        data-testid="button-start-recording"
                      >
                        <Mic className="w-6 h-6" />
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="lg"
                          variant="outline"
                          className="w-16 h-16 rounded-full"
                          onClick={isPaused ? resumeRecording : pauseRecording}
                          data-testid="button-pause-resume"
                        >
                          {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
                        </Button>
                        
                        <Button
                          size="lg"
                          variant="destructive"
                          className="w-16 h-16 rounded-full"
                          onClick={stopRecording}
                          data-testid="button-stop-recording"
                        >
                          <Square className="w-6 h-6" />
                        </Button>
                      </>
                    )}
                  </>
                ) : (
                  // Playback and action controls
                  <div className="flex justify-center space-x-3">
                    <Button
                      size="icon"
                      variant="outline"
                      className="w-12 h-12 rounded-full"
                      onClick={isPlaying ? pausePlayback : playRecording}
                      data-testid="button-play-pause"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </Button>
                    
                    <Button
                      size="icon"
                      variant="outline"
                      className="w-12 h-12 rounded-full"
                      onClick={resetRecording}
                      data-testid="button-reset"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </Button>
                    
                    <Button
                      size="lg"
                      className="w-16 h-16 rounded-full"
                      onClick={handleConfirm}
                      data-testid="button-confirm-audio"
                    >
                      <Check className="w-6 h-6" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Tips */}
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground text-center">
                  💡 Habla claro y cerca del micrófono para una mejor grabación
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
