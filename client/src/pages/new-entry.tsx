import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, Mic, Save, X, ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import EmotionSelector from "@/components/emotion-selector";
import CameraCapture from "@/components/camera-capture";
import AudioRecorder from "@/components/audio-recorder";
import NotificationToast from "@/components/notification-toast";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useStorage } from "@/hooks/use-storage";
import { queryClient } from "@/lib/queryClient";

const entrySchema = z.object({
  emotionId: z.string().min(1, "Selecciona una emoción"),
  textEntry: z.string().min(1, "Escribe algo sobre cómo te sientes"),
  photoFile: z.any().optional(),
  audioFile: z.any().optional(),
});

type EntryForm = z.infer<typeof entrySchema>;

export default function NewEntry() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { currentUser } = useStorage();
  const [showCamera, setShowCamera] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<File | null>(null);
  const [audioRecording, setAudioRecording] = useState<File | null>(null);
  const [showToast, setShowToast] = useState(false);
  
  const isOnboarding = new URLSearchParams(window.location.search).get('onboarding') === 'true';

  const { data: emotions = [] } = useQuery({
    queryKey: ['/api/emotions'],
  });

  const { data: activePlant } = useQuery({
    queryKey: ['/api/users', currentUser?.id, 'plant'],
    enabled: !!currentUser?.id,
  });

  const form = useForm<EntryForm>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      emotionId: "",
      textEntry: "",
    },
  });

  const entryMutation = useMutation({
    mutationFn: async (data: EntryForm) => {
      const formData = new FormData();
      formData.append('userId', currentUser!.id);
      formData.append('emotionId', data.emotionId);
      formData.append('textEntry', data.textEntry);

      if (activePlant && 'id' in activePlant && activePlant.id) {
        formData.append('plantId', activePlant.id);
      }
      
      if (capturedPhoto) {
        formData.append('photo', capturedPhoto);
      }
      
      if (audioRecording) {
        formData.append('audio', audioRecording);
      }

      const response = await apiRequest('POST', '/api/journal-entries', formData);
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate queries to refresh dashboard data
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${currentUser?.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', currentUser?.id, 'plant'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', currentUser?.id, 'journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', currentUser?.id, 'achievements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/achievements'] });

      setShowToast(true);

      // Check if new achievements were unlocked
      const hasNewAchievements = data?.newAchievements && data.newAchievements.length > 0;

      toast({
        title: hasNewAchievements ? "¡Entrada guardada y logro desbloqueado!" : "¡Entrada guardada!",
        description: hasNewAchievements
          ? `Has ganado +10 puntos y desbloqueado ${data.newAchievements.length} logro(s)!`
          : "Has ganado +10 puntos",
      });

      setTimeout(() => {
        if (isOnboarding) {
          setLocation('/onboarding');
        } else {
          setLocation('/dashboard');
        }
      }, 2000);
    },
    onError: (error: any) => {
      // Check if it's a consent error
      const errorMessage = error?.message || '';
      const isConsentError = errorMessage.includes('403') || errorMessage.includes('consent');

      if (isConsentError) {
        toast({
          title: "Verificación requerida",
          description: "Se necesita verificación de consentimiento parental para crear entradas.",
          variant: "destructive",
        });

        // Redirect to consent page after a delay
        setTimeout(() => {
          setLocation('/awaiting-consent');
        }, 2000);
      } else {
        toast({
          title: "Error",
          description: "No se pudo guardar tu entrada. Inténtalo de nuevo.",
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = (data: EntryForm) => {
    entryMutation.mutate(data);
  };

  const handlePhotoCapture = (photoFile: File) => {
    setCapturedPhoto(photoFile);
    setShowCamera(false);
  };

  const handleAudioCapture = (audioFile: File) => {
    setAudioRecording(audioFile);
    setShowAudioRecorder(false);
  };

  const removePhoto = () => {
    setCapturedPhoto(null);
  };

  const removeAudio = () => {
    setAudioRecording(null);
  };

  if (!currentUser) {
    setLocation('/welcome');
    return null;
  }

  if (showCamera) {
    return (
      <CameraCapture
        onCapture={handlePhotoCapture}
        onClose={() => setShowCamera(false)}
      />
    );
  }

  if (showAudioRecorder) {
    return (
      <AudioRecorder
        onCapture={handleAudioCapture}
        onClose={() => setShowAudioRecorder(false)}
      />
    );
  }

  return (
    <div className="h-screen bg-background overflow-y-auto">
      <div className="p-4 pb-20 space-y-6">
        {/* Header Card */}
        <Card className="sticky top-4 z-40 bg-gradient-to-r from-primary to-accent text-white border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setLocation(isOnboarding ? '/onboarding' : '/dashboard')}
                  className="w-10 h-10 bg-white bg-opacity-20 hover:bg-white hover:bg-opacity-30"
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </Button>
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center shadow-lg">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Nueva Entrada</h1>
                  <p className="text-xs opacity-90">
                    {isOnboarding ? "Paso 1 del tutorial" : "Tu bitácora emocional"}
                  </p>
                </div>
              </div>
              {capturedPhoto || audioRecording ? (
                <div className="flex items-center space-x-1">
                  {capturedPhoto && (
                    <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                      <Camera className="w-4 h-4 text-white" />
                    </div>
                  )}
                  {audioRecording && (
                    <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                      <Mic className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Emotion Selection */}
            <Card data-testid="card-emotion-selection">
              <CardHeader>
                <CardTitle>¿Cómo te sientes hoy?</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="emotionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <EmotionSelector
                          emotions={emotions || []}
                          selectedId={field.value}
                          onSelect={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Photo Capture */}
            <Card data-testid="card-photo-capture">
              <CardHeader>
                <CardTitle>Foto de tu planta</CardTitle>
              </CardHeader>
              <CardContent>
                {capturedPhoto ? (
                  <div className="relative">
                    <img
                      src={URL.createObjectURL(capturedPhoto)}
                      alt="Foto capturada"
                      className="w-full h-48 object-cover rounded-lg"
                      data-testid="img-captured-photo"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={removePhoto}
                      data-testid="button-remove-photo"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-32 border-dashed flex-col space-y-2 hover-elevate"
                    onClick={() => setShowCamera(true)}
                    data-testid="button-take-photo"
                  >
                    <Camera className="w-8 h-8 text-muted-foreground" />
                    <div className="text-center">
                      <p className="font-semibold">Tomar foto</p>
                      <p className="text-xs text-muted-foreground">O subir desde galería</p>
                    </div>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Text Input */}
            <Card data-testid="card-text-entry">
              <CardHeader>
                <CardTitle>Cuéntanos más</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="textEntry"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Hoy sentí... porque..."
                          className="min-h-24"
                          {...field}
                          data-testid="textarea-text-entry"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Audio Recording */}
                <div className="mt-4">
                  {audioRecording ? (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Mic className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold">Nota de voz grabada</span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={removeAudio}
                        data-testid="button-remove-audio"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex items-center space-x-2 text-primary p-0 h-auto"
                      onClick={() => setShowAudioRecorder(true)}
                      data-testid="button-record-audio"
                    >
                      <Mic className="w-4 h-4" />
                      <span>Grabar nota de voz</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <Button
              type="submit"
              className="w-full py-4 text-lg font-bold"
              disabled={entryMutation.isPending}
              data-testid="button-save-entry"
            >
              {entryMutation.isPending ? (
                <div className="flex items-center">
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Guardando...
                </div>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Guardar entrada (+10 pts)
                </>
              )}
            </Button>
          </form>
        </Form>

        {/* Success Toast */}
        <NotificationToast
          message="¡Entrada guardada! +10 puntos"
          isVisible={showToast}
          onHide={() => setShowToast(false)}
        />
      </div>
    </div>
  );
}
