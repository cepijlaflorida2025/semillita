import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BookOpen, Calendar, Droplets, Leaf, ArrowLeft, Plus, Trash2, UserX, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useStorage } from "@/hooks/use-storage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function PlantProfile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { currentUser, clearStorage } = useStorage();
  const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
  const [showDeleteEntryDialog, setShowDeleteEntryDialog] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const isOnboarding = new URLSearchParams(window.location.search).get('onboarding') === 'true';

  const { data: plant, isLoading } = useQuery({
    queryKey: ['/api/users', currentUser?.id, 'plant'],
    enabled: !!currentUser?.id,
  });

  const { data: journalEntries = [], isLoading: isLoadingEntries } = useQuery({
    queryKey: ['/api/users', currentUser?.id, 'journal-entries'],
    enabled: !!currentUser?.id,
  });

  // Delete user mutation (for children to delete themselves)
  const deleteUserMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/users/${currentUser?.id}?requestingUserId=${currentUser?.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al eliminar usuario');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Usuario eliminado",
        description: "Tu usuario ha sido eliminado exitosamente.",
      });
      clearStorage();
      queryClient.clear();
      setTimeout(() => {
        setLocation('/welcome');
      }, 100);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete journal entry mutation
  const deleteEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const response = await fetch(`/api/journal-entries/${entryId}?requestingUserId=${currentUser?.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al eliminar entrada');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Entrada eliminada",
        description: "La entrada ha sido eliminada exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users', currentUser?.id, 'journal-entries'] });
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${currentUser?.id}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteUser = () => {
    deleteUserMutation.mutate();
  };

  const handleDeleteEntry = (entryId: string) => {
    setEntryToDelete(entryId);
    setShowDeleteEntryDialog(true);
  };

  const confirmDeleteEntry = () => {
    if (entryToDelete) {
      deleteEntryMutation.mutate(entryToDelete);
      setShowDeleteEntryDialog(false);
      setEntryToDelete(null);
    }
  };

  const handleAudioPlayback = (audioUrl: string, entryId: string) => {
    // If same audio is playing, pause it
    if (playingAudioId === entryId && audioElement) {
      audioElement.pause();
      setPlayingAudioId(null);
      setAudioElement(null);
      return;
    }

    // Stop any currently playing audio
    if (audioElement) {
      audioElement.pause();
      setAudioElement(null);
    }

    // Play new audio
    const audio = new Audio(audioUrl);
    audio.play();
    setPlayingAudioId(entryId);
    setAudioElement(audio);

    audio.onended = () => {
      setPlayingAudioId(null);
      setAudioElement(null);
    };
  };

  // Calculate days since planting (Día 1 = first day, Día 2 = second day, etc.)
  const daysSincePlanting = plant ?
    Math.floor((Date.now() - new Date(plant.plantedAt).getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0;

  // Show all journal entries for the user, not just plant-specific ones
  const allEntries = Array.isArray(journalEntries) ? journalEntries : [];

  // Sort entries by date (most recent first)
  const sortedEntries = [...allEntries].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Group entries by day number (relative to plant creation)
  const groupedEntriesByDay = sortedEntries.reduce((acc, entry) => {
    const entryDate = new Date(entry.createdAt);
    const plantDate = plant?.plantedAt ? new Date(plant.plantedAt) : entryDate;

    // Calculate day number since planting
    const daysSincePlanting = Math.floor((entryDate.getTime() - plantDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const dayKey = `Día ${daysSincePlanting}`;

    if (!acc[dayKey]) {
      acc[dayKey] = [];
    }
    acc[dayKey].push(entry);

    return acc;
  }, {} as Record<string, typeof sortedEntries>);

  // Sort day keys in descending order (most recent first)
  const sortedDayKeys = Object.keys(groupedEntriesByDay).sort((a, b) => {
    const dayA = parseInt(a.replace('Día ', ''));
    const dayB = parseInt(b.replace('Día ', ''));
    return dayB - dayA;
  });

  if (!currentUser) {
    setLocation('/welcome');
    return null;
  }

  if (isLoading || isLoadingEntries) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">
          <Leaf className="w-8 h-8 text-primary" />
        </div>
      </div>
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
                  <h1 className="text-lg font-bold">Mi Bitácora</h1>
                  <p className="text-xs opacity-90">
                    {isOnboarding ? "Tus registros emocionales" : "Historial de entradas"}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setLocation('/new-entry')}
                  className="w-10 h-10 bg-white bg-opacity-20 hover:bg-white hover:bg-opacity-30"
                  data-testid="button-new-entry"
                >
                  <Plus className="w-5 h-5 text-white" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        {plant && (
          <Card data-testid="card-summary-stats">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-primary">{daysSincePlanting}</div>
                  <div className="text-sm text-muted-foreground">Días cultivando</div>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Droplets className="w-6 h-6 text-accent-foreground" />
                  </div>
                  <div className="text-2xl font-bold text-accent-foreground">
                    {allEntries.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Entradas</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Journal Entries Grouped by Day */}
        {sortedEntries.length > 0 ? (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-foreground px-2">Historial de Registros</h2>
            {sortedDayKeys.map((dayKey) => (
              <div key={dayKey} className="space-y-4">
                {/* Day Separator */}
                <div className="flex items-center space-x-3 px-2">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-primary">{dayKey}</h3>
                    <div className="h-px bg-border mt-1"></div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {groupedEntriesByDay[dayKey].length} {groupedEntriesByDay[dayKey].length === 1 ? 'registro' : 'registros'}
                  </Badge>
                </div>

                {/* Entries for this day */}
                {groupedEntriesByDay[dayKey].map((entry) => (
                  <Card key={entry.id} className="hover-elevate transition-all" data-testid="card-journal-entry">
                    <CardContent className="p-5">
                      <div className="space-y-4">
                        {/* Entry Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            {/* Emotion Emoji */}
                            <div className="w-16 h-16 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                              <span className="text-3xl" data-testid="emoji-entry-emotion">
                                {entry.emotion?.emoji || '😊'}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-bold text-lg text-foreground" data-testid="text-emotion-name">
                                {entry.emotion?.name || 'Emoción'}
                              </h3>
                              <Badge variant="outline" className="text-xs mt-1">
                                {new Date(entry.createdAt).toLocaleTimeString('es', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteEntry(entry.id)}
                            data-testid="button-delete-entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Entry Photo */}
                        {entry.photoUrl && (
                          <div className="w-full">
                            <img
                              src={entry.photoUrl}
                              alt="Foto de la planta"
                              className="w-full h-56 object-cover rounded-lg shadow-md"
                              data-testid="img-entry-photo"
                            />
                          </div>
                        )}

                        {/* Entry Audio */}
                        {entry.audioUrl && (
                          <div className="bg-primary/5 p-4 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  playingAudioId === entry.id ? 'bg-primary animate-pulse' : 'bg-primary/20'
                                }`}>
                                  {playingAudioId === entry.id ? (
                                    <Pause className="w-5 h-5 text-white" />
                                  ) : (
                                    <Play className="w-5 h-5 text-primary" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-foreground">Nota de voz</p>
                                  <p className="text-xs text-muted-foreground">
                                    {playingAudioId === entry.id ? 'Reproduciendo...' : 'Toca para escuchar'}
                                  </p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant={playingAudioId === entry.id ? "default" : "outline"}
                                onClick={() => handleAudioPlayback(entry.audioUrl, entry.id)}
                                data-testid="button-play-audio"
                              >
                                {playingAudioId === entry.id ? (
                                  <>
                                    <Pause className="w-4 h-4 mr-1" />
                                    Pausar
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-4 h-4 mr-1" />
                                    Reproducir
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Entry Text - Full description */}
                        <div className="bg-muted/50 p-4 rounded-lg">
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap" data-testid="text-entry-content">
                            {entry.textEntry}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <Card data-testid="card-no-entries">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No hay entradas aún</h3>
              <p className="text-muted-foreground mb-6">
                Comienza tu viaje emocional creando tu primera entrada
              </p>
              <Button onClick={() => setLocation('/new-entry')} data-testid="button-create-first-entry">
                <Plus className="w-4 h-4 mr-2" />
                Crear primera entrada
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={showDeleteUserDialog} onOpenChange={setShowDeleteUserDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tu usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente tu usuario <strong>{currentUser?.alias}</strong> y todos tus datos asociados (planta, entradas, logros, etc.). Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-500 hover:bg-red-600"
            >
              Eliminar mi usuario
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Entry Confirmation Dialog */}
      <AlertDialog open={showDeleteEntryDialog} onOpenChange={setShowDeleteEntryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar entrada?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente esta entrada de tu bitácora. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEntryToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteEntry}
              className="bg-red-500 hover:bg-red-600"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
