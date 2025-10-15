import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Calendar, Star, BookOpen, Sprout, Trophy, Award, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStorage } from "@/hooks/use-storage";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
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

interface JournalEntry {
  id: string;
  userId: string;
  plantId: string | null;
  emotionId: string | null;
  createdAt: string;
  updatedAt: string | null;
  emotion: {
    id?: string;
    emoji: string;
    name: string;
    color: string;
    description?: string;
  } | null;
  textEntry: string | null;
  photoUrl: string | null;
  audioUrl: string | null;
  pointsEarned: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  iconName: string;
  pointsRequired: number;
  earned: boolean;
}

interface UserReward {
  id: string;
  purchasedAt: string;
  reward: {
    id: string;
    name: string;
    description: string;
    emoji: string;
    pointsCost: number;
    category: string;
  };
}

interface ChildProfileData {
  child: {
    id: string;
    alias: string;
    age: number;
    points: number;
    avatar: string;
    colorTheme: string;
    createdAt: string;
    journalEntriesCount: number;
  };
  journalEntries: JournalEntry[];
  plant: {
    name: string;
    type: string;
    status: string;
    plantedAt: string;
    latestPhotoUrl: string | null;
  } | null;
  achievements: Achievement[];
  userRewards: UserReward[];
}

const AVATAR_OPTIONS = [
  { id: 'plant1', emoji: '🌱', name: 'Brote' },
  { id: 'plant2', emoji: '🌿', name: 'Hoja' },
  { id: 'flower1', emoji: '🌸', name: 'Flor Rosa' },
  { id: 'flower2', emoji: '🌻', name: 'Girasol' },
  { id: 'tree', emoji: '🌳', name: 'Árbol' },
  { id: 'cactus', emoji: '🌵', name: 'Cactus' },
];

const COLOR_THEMES = [
  { id: 'green', name: 'Verde', color: 'bg-green-500' },
  { id: 'blue', name: 'Azul', color: 'bg-blue-500' },
  { id: 'purple', name: 'Morado', color: 'bg-purple-500' },
  { id: 'pink', name: 'Rosa', color: 'bg-pink-500' },
  { id: 'orange', name: 'Naranja', color: 'bg-orange-500' },
  { id: 'yellow', name: 'Amarillo', color: 'bg-yellow-500' },
];

export default function ChildProfile() {
  const { currentUser, clearStorage } = useStorage();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/facilitator/child/:id");
  const [emotionFilter, setEmotionFilter] = useState("");
  const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
  const [showDeleteEntryDialog, setShowDeleteEntryDialog] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const childId = params?.id;

  const { data: profileData, isLoading, error } = useQuery<ChildProfileData>({
    queryKey: [`/api/facilitator/child/${childId}`],
    enabled: !!currentUser?.id && currentUser?.role === 'facilitator' && !!childId,
    refetchOnWindowFocus: true, // Only refetch when window regains focus
    staleTime: 30000, // Consider data stale after 30 seconds
    retry: 1, // Retry failed requests once
    retryDelay: 1000, // Wait 1 second between retries
  });

  // Fetch emotions list
  const { data: emotionsData } = useQuery<Array<{ id: string; name: string; emoji: string; color: string }>>({
    queryKey: ['/api/emotions'],
    enabled: !!currentUser?.id,
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}?requestingUserId=${currentUser?.id}`, {
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
        description: "El usuario ha sido eliminado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/facilitator/dashboard'] });
      setLocation('/facilitator/dashboard');
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
      queryClient.invalidateQueries({ queryKey: [`/api/facilitator/child/${childId}`] });
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
    if (childId) {
      deleteUserMutation.mutate(childId);
    }
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

  if (!currentUser || currentUser.role !== 'facilitator') {
    setLocation('/welcome');
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">
          <Sprout className="w-8 h-8 text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">Error al cargar el perfil del niño</p>
            <p className="text-sm text-red-500 mb-4">{error instanceof Error ? error.message : 'Error desconocido'}</p>
            <Button
              className="mt-4"
              onClick={() => setLocation('/facilitator/dashboard')}
            >
              Volver al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No se pudo cargar el perfil del niño</p>
            <Button
              className="mt-4"
              onClick={() => setLocation('/facilitator/dashboard')}
            >
              Volver al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { child, journalEntries = [], plant, achievements, userRewards } = profileData;
  const childAvatar = AVATAR_OPTIONS.find(a => a.id === child.avatar) || AVATAR_OPTIONS[0];
  const childColorTheme = COLOR_THEMES.find(c => c.id === child.colorTheme) || COLOR_THEMES[0];

  const daysSincePlanting = plant
    ? Math.floor((Date.now() - new Date(plant.plantedAt).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;

  const earnedAchievements = achievements.filter(a => a.earned);
  const emotions = emotionsData || [];

  // Filtered journal entries based on emotion
  const filteredJournalEntries = emotionFilter
    ? journalEntries.filter(entry => entry.emotion?.name === emotionFilter)
    : journalEntries;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAchievementIcon = (iconName: string) => {
    const iconClass = "w-5 h-5 text-primary";
    switch (iconName) {
      case 'seedling':
        return <Sprout className={iconClass} />;
      case 'calendar-check':
        return <Calendar className={iconClass} />;
      case 'leaf':
        return <Star className={iconClass} />;
      case 'book-open':
        return <BookOpen className={iconClass} />;
      case 'trophy':
        return <Trophy className={iconClass} />;
      case 'star':
        return <Star className={iconClass} />;
      default:
        return <Award className={iconClass} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 space-y-6 pb-8">
        {/* Child Info Card */}
        <Card className="bg-gradient-to-r from-primary to-accent text-white border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Button
                size="icon"
                variant="ghost"
                className="w-8 h-8 bg-white bg-opacity-20 hover:bg-white hover:bg-opacity-30"
                onClick={() => setLocation('/facilitator/dashboard')}
              >
                <ArrowLeft className="w-4 h-4 text-white" />
              </Button>
              <h2 className="text-sm opacity-90">Perfil del Niño</h2>
              <Button
                size="icon"
                variant="ghost"
                className="w-8 h-8 bg-red-500 bg-opacity-80 hover:bg-red-600 hover:bg-opacity-90"
                onClick={() => setShowDeleteUserDialog(true)}
                title="Eliminar usuario"
              >
                <Trash2 className="w-4 h-4 text-white" />
              </Button>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`w-16 h-16 ${childColorTheme.color} rounded-full flex items-center justify-center shadow-lg`}>
                <span className="text-3xl">{childAvatar.emoji}</span>
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold">{child.alias}</h1>
                <div className="flex items-center space-x-3 text-sm opacity-90 mt-1">
                  <span>{child.age} años</span>
                  <span>•</span>
                  <span>{child.points} puntos</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{journalEntries.length}</div>
              <div className="text-sm text-muted-foreground">Entradas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-accent-foreground">{daysSincePlanting}</div>
              <div className="text-sm text-muted-foreground">Días cultivando</div>
            </CardContent>
          </Card>
        </div>

        {/* Plant Info */}
        {plant && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3 mb-3">
                <Sprout className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Su Planta</h3>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{plant.name || plant.type}</p>
                  <p className="text-sm text-muted-foreground capitalize">{plant.status}</p>
                </div>
                {plant.latestPhotoUrl && (
                  <img
                    src={plant.latestPhotoUrl}
                    alt="Planta"
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Achievements Section */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Trophy className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Logros</h3>
              </div>
              <Badge variant="secondary">
                {earnedAchievements.length} de {achievements.length}
              </Badge>
            </div>

            {earnedAchievements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aún no ha conseguido ningún logro
              </p>
            ) : (
              <div className="space-y-2">
                {earnedAchievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="flex items-center space-x-3 p-2 bg-primary/5 rounded-lg"
                  >
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      {getAchievementIcon(achievement.iconName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {achievement.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {achievement.description}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      <Star className="w-3 h-3 mr-1" />
                      {achievement.pointsRequired}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rewards Section */}
        {userRewards.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3 mb-4">
                <ShoppingBag className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Recompensas Canjeadas</h3>
              </div>

              <div className="space-y-2">
                {userRewards.map((userReward) => (
                  <div
                    key={userReward.id}
                    className="flex items-center space-x-3 p-2 bg-accent/5 rounded-lg"
                  >
                    <div className="text-2xl flex-shrink-0">
                      {userReward.reward.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {userReward.reward.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Canjeado el {formatDate(userReward.purchasedAt)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {userReward.reward.pointsCost} pts
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Journal Entries - Bitácora */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Bitácora Emocional</h2>
          </div>

          {/* Emotion filter for journal entries */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <label className="text-xs text-muted-foreground font-semibold">
                Filtrar entradas por emoción:
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={emotionFilter === "" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEmotionFilter("")}
                  className="h-9"
                >
                  Todas ({journalEntries.length})
                </Button>
                {emotions.map((emotion) => {
                  const count = journalEntries.filter(e => e.emotion?.name === emotion.name).length;
                  return (
                    <Button
                      key={emotion.id}
                      variant={emotionFilter === emotion.name ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEmotionFilter(emotion.name)}
                      className="h-9"
                      disabled={count === 0}
                    >
                      <span className="mr-1">{emotion.emoji}</span>
                      {emotion.name} ({count})
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {journalEntries.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No hay entradas en la bitácora aún</p>
              </CardContent>
            </Card>
          ) : filteredJournalEntries.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No hay entradas con la emoción seleccionada</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredJournalEntries.map((entry) => (
                <Card key={entry.id} className="hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      {/* Emotion */}
                      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">
                          {entry.emotion?.emoji || '😊'}
                        </span>
                      </div>

                      {/* Entry content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <Badge
                            variant="secondary"
                            className="text-xs"
                            style={{
                              backgroundColor: entry.emotion?.color ? `${entry.emotion.color}20` : undefined
                            }}
                          >
                            {entry.emotion?.name || 'Sin emoción'}
                          </Badge>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDate(entry.createdAt)}
                          </div>
                        </div>

                        {entry.textEntry && (
                          <p className="text-sm text-foreground mb-2">
                            {entry.textEntry}
                          </p>
                        )}

                        {entry.photoUrl && (
                          <img
                            src={entry.photoUrl}
                            alt="Foto de entrada"
                            className="w-full h-32 object-cover rounded-lg mt-2"
                          />
                        )}

                        <div className="flex items-center justify-between mt-2">
                          <Badge variant="outline" className="text-xs">
                            <Star className="w-3 h-3 mr-1" />
                            +{entry.pointsEarned} pts
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteEntry(entry.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={showDeleteUserDialog} onOpenChange={setShowDeleteUserDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el usuario <strong>{child.alias}</strong> y todos sus datos asociados (plantas, entradas, logros, etc.). Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-500 hover:bg-red-600"
            >
              Eliminar
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
              Esta acción eliminará permanentemente esta entrada de la bitácora. Esta acción no se puede deshacer.
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
