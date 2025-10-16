import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Sprout, Star, HelpCircle, Camera, Plus, BookOpen, Leaf, LogOut, Calendar, Trophy, Award, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import BottomNavigation from "@/components/bottom-navigation";
import NotificationToast from "@/components/notification-toast";
import PhotoSelector from "@/components/photo-selector";
import { useStorage } from "@/hooks/use-storage";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

// Avatar and color options (shared with register.tsx)
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

interface DashboardData {
  user: any;
  plant: any;
  latestEntry: any;
  achievements: any[];
  seeds: any[];
}

export default function Dashboard() {
  const { currentUser, clearStorage } = useStorage();
  const [, setLocation] = useLocation();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showPhotoSelector, setShowPhotoSelector] = useState(false);
  const [selectedDashboardPhoto, setSelectedDashboardPhoto] = useState<string | null>(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const { toast } = useToast();

  // Accessibility settings
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');

  // Redirect facilitators to their own dashboard
  useEffect(() => {
    if (currentUser?.role === 'facilitator') {
      setLocation('/facilitator/dashboard');
    }
  }, [currentUser?.role, setLocation]);

  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: [`/api/dashboard/${currentUser?.id}`],
    enabled: !!currentUser?.id,
  });

  // Load accessibility settings from user data
  useEffect(() => {
    if (dashboardData?.user?.accessibilitySettings) {
      const settings = dashboardData.user.accessibilitySettings as { fontSize?: 'small' | 'medium' | 'large' };
      if (settings.fontSize) {
        setFontSize(settings.fontSize);
      }
    }
  }, [dashboardData?.user?.accessibilitySettings]);

  // Fetch journal entries for photo selector
  const { data: journalEntries = [] } = useQuery({
    queryKey: ['/api/users', currentUser?.id, 'journal-entries'],
    enabled: !!currentUser?.id && showPhotoSelector,
  });

  const showNotification = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
  };

  const confirmLogout = () => {
    // Show success notification using global toast
    toast({
      title: "¡Hasta pronto!",
      description: "Has cerrado sesión correctamente.",
    });

    // Clear React Query caches to prevent stale data
    queryClient.clear();

    // Clear local storage
    clearStorage();

    // Navigate after a brief delay to allow the toast to show
    setTimeout(() => {
      setLocation('/welcome');
    }, 100);
  };

  const handlePhotoSelect = (photoUrl: string) => {
    setSelectedDashboardPhoto(photoUrl);
    toast({
      title: "¡Foto actualizada!",
      description: "La foto del dashboard se ha actualizado correctamente.",
    });
  };

  // Delete user mutation
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
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el usuario.",
        variant: "destructive",
      });
    },
  });

  // Update accessibility settings mutation
  const updateAccessibilityMutation = useMutation({
    mutationFn: async (settings: { fontSize: 'small' | 'medium' | 'large' }) => {
      const response = await fetch(`/api/users/${currentUser?.id}/accessibility-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessibilitySettings: settings }),
      });
      if (!response.ok) {
        throw new Error('Error al guardar ajustes');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Ajustes guardados",
        description: "Tus ajustes de accesibilidad se han guardado correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${currentUser?.id}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudieron guardar los ajustes.",
        variant: "destructive",
      });
    },
  });

  const handleFontSizeChange = (newSize: 'small' | 'medium' | 'large') => {
    setFontSize(newSize);
    updateAccessibilityMutation.mutate({ fontSize: newSize });
  };

  // handleDeleteUser is not needed anymore - button calls setShowDeleteUserDialog directly

  const confirmDeleteUser = () => {
    deleteUserMutation.mutate();
  };

  if (!currentUser) {
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

  const user = dashboardData?.user || currentUser;
  const plant = dashboardData?.plant;
  const latestEntry = dashboardData?.latestEntry;
  const achievements = dashboardData?.achievements || [];
  const seeds = dashboardData?.seeds || [];

  // Calculate days since planting (Día 1 = first day, Día 2 = second day, etc.)
  const daysSincePlanting = plant ?
    Math.floor((Date.now() - new Date(plant.plantedAt).getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0;

  // Calculate progress for the next achievement in progress (not completed, but with progress > 0)
  const getNextAchievementProgress = () => {
    const journalEntriesCount = dashboardData?.user?.journalEntriesCount || 0;
    const userPoints = dashboardData?.user?.points || 0;

    // Find unearned achievements and calculate their progress
    const unearnedAchievements = achievements.filter((a: any) => !a.earned);

    if (unearnedAchievements.length === 0) {
      return {
        percentage: 100,
        milestone: "¡No hay más hitos por el momento!",
        iconName: 'trophy'
      };
    }

    // Calculate progress for each unearned achievement
    const achievementsWithProgress = [];

    for (const achievement of unearnedAchievements) {
      try {
        const condition = JSON.parse(achievement.condition);
        let progress = 0;
        let milestoneName = achievement.name;

        switch (condition.type) {
          case 'plant_created':
            progress = plant ? 100 : 0;
            milestoneName = `${achievement.name}`;
            break;
          case 'journal_entries':
            progress = Math.min((journalEntriesCount / condition.count) * 100, 100);
            milestoneName = `${achievement.name} (${journalEntriesCount}/${condition.count})`;
            break;
          case 'days_caring':
            progress = Math.min((daysSincePlanting / condition.count) * 100, 100);
            milestoneName = `${achievement.name} (${daysSincePlanting}/${condition.count} días)`;
            break;
          case 'points':
            const threshold = condition.threshold || achievement.pointsRequired;
            progress = Math.min((userPoints / threshold) * 100, 100);
            milestoneName = `${achievement.name} (${userPoints}/${threshold} pts)`;
            break;
        }

        // Only include achievements with progress >= 0 and < 100 (not completed)
        if (progress >= 0 && progress < 100) {
          achievementsWithProgress.push({
            progress: Math.round(progress),
            milestone: milestoneName,
            iconName: achievement.iconName,
            achievement: achievement
          });
        }
      } catch (error) {
        console.error('Error parsing achievement condition:', error);
      }
    }

    // If we have achievements with progress data, show the one with most progress
    // If all are at 0%, show the first one
    if (achievementsWithProgress.length > 0) {
      const maxProgressAchievement = achievementsWithProgress.reduce((max, curr) =>
        curr.progress > max.progress ? curr : max
      );
      return maxProgressAchievement;
    }

    // Fallback: If no achievements were calculated (shouldn't happen), show the first unearned one
    if (unearnedAchievements.length > 0) {
      const firstUnearned = unearnedAchievements[0];
      try {
        const condition = JSON.parse(firstUnearned.condition);
        let milestoneName = firstUnearned.name;

        switch (condition.type) {
          case 'journal_entries':
            milestoneName = `${firstUnearned.name} (${journalEntriesCount}/${condition.count})`;
            break;
          case 'days_caring':
            milestoneName = `${firstUnearned.name} (${daysSincePlanting}/${condition.count} días)`;
            break;
          case 'points':
            const threshold = condition.threshold || firstUnearned.pointsRequired;
            milestoneName = `${firstUnearned.name} (${userPoints}/${threshold} pts)`;
            break;
        }

        return {
          percentage: 0,
          milestone: milestoneName,
          iconName: firstUnearned.iconName
        };
      } catch {
        return {
          percentage: 0,
          milestone: firstUnearned.name,
          iconName: firstUnearned.iconName
        };
      }
    }

    return {
      percentage: 0,
      milestone: "¡Comienza tu viaje!",
      iconName: 'sprout'
    };
  };

  const progressData = getNextAchievementProgress();
  const { percentage: progressPercentage, milestone: nextMilestone, iconName: currentMilestoneIcon } = progressData;

  // Debug: Log progress data
  console.log('Dashboard Progress Data:', {
    progressPercentage,
    nextMilestone,
    currentMilestoneIcon,
    achievementsCount: achievements.length,
    journalEntriesCount: dashboardData?.user?.journalEntriesCount,
    userPoints: dashboardData?.user?.points
  });

  // Get achievement icon component
  const getAchievementIcon = (iconName: string) => {
    const iconClass = "w-5 h-5 text-primary";

    switch (iconName) {
      case 'seedling':
        return <Sprout className={iconClass} />;
      case 'calendar-check':
        return <Calendar className={iconClass} />;
      case 'leaf':
        return <Leaf className={iconClass} />;
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

  // Get user's avatar and color theme
  const userAvatar = user?.avatar ? AVATAR_OPTIONS.find(a => a.id === user.avatar) || AVATAR_OPTIONS[0] : AVATAR_OPTIONS[0];
  const userColorTheme = user?.colorTheme ? COLOR_THEMES.find(c => c.id === user.colorTheme) || COLOR_THEMES[0] : COLOR_THEMES[0];

  // Get font size class
  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'small':
        return 'text-sm';
      case 'large':
        return 'text-lg';
      default:
        return 'text-base';
    }
  };

  return (
    <div className={`h-screen bg-background overflow-y-auto ${getFontSizeClass()}`}>
      {/* Main Content */}
      <main className="p-4 pb-20 space-y-6 fade-in relative">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none">
          <Leaf className="w-24 h-24 text-primary float-animation" />
        </div>

        {/* Header Card */}
        <Card className="sticky top-4 z-40 bg-gradient-to-r from-primary to-accent text-white border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 ${userColorTheme.color} rounded-full flex items-center justify-center shadow-lg`}>
                  <span className="text-2xl">{userAvatar.emoji}</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold">{user.alias}</h1>
                  <p className="text-xs opacity-90">Día {daysSincePlanting} cultivando</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className="bg-accent text-accent-foreground font-semibold" data-testid="badge-user-points">
                  <Star className="w-3 h-3 mr-1" />
                  {user.points} pts
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-8 h-8 bg-white bg-opacity-20 hover:bg-white hover:bg-opacity-30"
                  data-testid="button-help"
                  onClick={() => setLocation('/help')}
                >
                  <HelpCircle className="w-4 h-4 text-white" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-8 h-8 bg-white bg-opacity-20 hover:bg-white hover:bg-opacity-30"
                  data-testid="button-settings"
                  onClick={() => setShowSettingsDialog(true)}
                  title="Ajustes"
                >
                  <Settings className="w-4 h-4 text-white" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Plant Status Card */}
        <Card className="plant-card transition-all hover-elevate" data-testid="card-plant-status">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Mi Planta</h2>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                <span className="text-sm text-muted-foreground" data-testid="text-plant-status">
                  {plant?.status === 'growing' ? 'Creciendo' : 'Sin planta'}
                </span>
              </div>
            </div>
            
            {selectedDashboardPhoto || latestEntry?.photoUrl || plant?.latestPhotoUrl ? (
              <div className="relative mb-4">
                <img
                  src={selectedDashboardPhoto || latestEntry?.photoUrl || plant?.latestPhotoUrl || ''}
                  alt="Foto de tu planta"
                  className="w-full h-48 object-cover rounded-lg shadow-md"
                  data-testid="img-plant-photo"
                />
                <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
                  <Camera className="w-3 h-3 mr-1" />
                  {selectedDashboardPhoto ? 'Seleccionada' : latestEntry?.photoUrl ? 'Última entrada' : 'Planta'}
                </Badge>
              </div>
            ) : (
              <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center mb-4">
                <div className="text-center">
                  <Sprout className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground font-semibold">Sin foto aún</p>
                  <p className="text-xs text-muted-foreground mt-1">Toma tu primera foto</p>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary" data-testid="text-days-count">
                  {daysSincePlanting}
                </div>
                <div className="text-sm text-muted-foreground">Días</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent-foreground" data-testid="text-entries-count">
                  {dashboardData?.user?.journalEntriesCount || 0}
                </div>
                <div className="text-sm text-muted-foreground">Entradas</div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    {getAchievementIcon(currentMilestoneIcon)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">Hito en Curso</div>
                    <p className="text-xs text-muted-foreground">
                      {nextMilestone}
                    </p>
                  </div>
                </div>
                <span className="text-lg font-bold text-primary" data-testid="text-progress-percentage">
                  {progressPercentage}%
                </span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
            </div>
            
            <Button
              className="w-full"
              data-testid="button-take-photo"
              onClick={() => setShowPhotoSelector(true)}
            >
              <Camera className="w-4 h-4 mr-2" />
              Seleccionar foto
            </Button>
          </CardContent>
        </Card>
        
        {/* Latest Emotion Card */}
        {latestEntry && (
          <Card data-testid="card-latest-emotion">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-4">Última Emoción</h3>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl" data-testid="emoji-latest-emotion">
                    {latestEntry.emotion?.emoji || '😊'}
                  </span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold" data-testid="text-emotion-label">
                    {latestEntry.emotion?.name || 'Sin emoción'}
                  </h4>
                  <p className="text-sm text-muted-foreground" data-testid="text-emotion-note">
                    {latestEntry.textEntry || 'Sin notas'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1" data-testid="text-emotion-timestamp">
                    {latestEntry.createdAt ? new Date(latestEntry.createdAt).toLocaleDateString('es') : ''}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button 
            className="bg-accent text-accent-foreground font-semibold py-8 h-auto flex-col space-y-2 hover-elevate active-elevate-2"
            data-testid="button-new-entry"
            onClick={() => setLocation('/new-entry')}
          >
            <Plus className="w-6 h-6" />
            <div className="font-bold">Nueva Entrada</div>
            <div className="text-xs opacity-80">+10 puntos</div>
          </Button>
          
          <Button 
            variant="secondary"
            className="font-semibold py-8 h-auto flex-col space-y-2 hover-elevate active-elevate-2"
            data-testid="button-view-history"
            onClick={() => setLocation('/plant')}
          >
            <BookOpen className="w-6 h-6" />
            <div className="font-bold">Mi Bitácora</div>
            <div className="text-xs opacity-80">Ver historial</div>
          </Button>
        </div>
        
        {/* Achievements Section */}
        <Card data-testid="card-achievements">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Logros</h3>
              <Button 
                variant="ghost" 
                size="sm"
                data-testid="button-view-achievements"
                onClick={() => setLocation('/achievements')}
              >
                Ver todos
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {achievements.slice(0, 3).map((achievement: any, index: number) => {
                const icons = {
                  'seedling': Sprout,
                  'leaf': Leaf,
                  'calendar-check': BookOpen,
                  'book-open': BookOpen,
                };
                const Icon = icons[achievement.iconName as keyof typeof icons] || Sprout;
                const isEarned = achievement.earned;

                return (
                  <div key={achievement.id} className={`text-center ${!isEarned ? 'opacity-50' : ''}`}>
                    <div className={`w-12 h-12 ${isEarned ? 'bg-primary bg-opacity-10' : 'bg-muted'} rounded-full flex items-center justify-center mb-2 mx-auto`}>
                      <Icon className={`w-6 h-6 ${isEarned ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className={`text-xs font-semibold ${!isEarned ? 'text-muted-foreground' : ''}`}>
                      {achievement.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        
        {/* Seed Vault Preview */}
        <Card data-testid="card-seed-vault">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Mi Guardador de Semillas</h3>
              <Button 
                variant="ghost" 
                size="sm"
                data-testid="button-open-seed-vault"
                onClick={() => setLocation('/seed-vault')}
              >
                Abrir
              </Button>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-secondary rounded-lg flex items-center justify-center border-2 border-border">
                <Sprout className="w-8 h-8 text-secondary-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold" data-testid="text-seeds-count">
                  {seeds.length} semillas guardadas
                </p>
                <p className="text-sm text-muted-foreground">
                  {seeds.length > 0 ? seeds.map(s => s.type).slice(0, 3).join(', ') : 'Aún no has guardado semillas'}
                </p>
                {seeds.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-primary p-0 h-auto font-semibold mt-1"
                    data-testid="button-share-seeds"
                  >
                    <span className="text-xs">🔗 Compartir</span>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />

      {/* Notification Toast */}
      <NotificationToast
        message={toastMessage}
        isVisible={showToast}
        onHide={() => setShowToast(false)}
      />

      {/* Photo Selector Modal */}
      {showPhotoSelector && (
        <PhotoSelector
          entries={journalEntries}
          onSelect={handlePhotoSelect}
          onClose={() => setShowPhotoSelector(false)}
          currentPhotoUrl={selectedDashboardPhoto || latestEntry?.photoUrl || plant?.latestPhotoUrl}
        />
      )}

      {/* Settings Dialog */}
      <AlertDialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ajustes</AlertDialogTitle>
            <AlertDialogDescription>
              Personaliza la apariencia de la aplicación y gestiona tu cuenta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-6 py-4">
            {/* Accessibility Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Accesibilidad</h3>

              {/* Font Size */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Tamaño de fuente</label>
                <div className="flex gap-2">
                  <Button
                    variant={fontSize === 'small' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFontSizeChange('small')}
                    className="flex-1"
                  >
                    Pequeño
                  </Button>
                  <Button
                    variant={fontSize === 'medium' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFontSizeChange('medium')}
                    className="flex-1"
                  >
                    Mediano
                  </Button>
                  <Button
                    variant={fontSize === 'large' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFontSizeChange('large')}
                    className="flex-1"
                  >
                    Grande
                  </Button>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Account Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Cuenta</h3>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setShowSettingsDialog(false);
                  setShowLogoutDialog(true);
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar sesión
              </Button>
              <Button
                variant="destructive"
                className="w-full justify-start"
                onClick={() => {
                  setShowSettingsDialog(false);
                  setShowDeleteUserDialog(true);
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar mi cuenta
              </Button>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar sesión?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas cerrar sesión? Tendrás que ingresar tu contraseña nuevamente para acceder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLogout}>
              Cerrar sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              onClick={confirmDeleteUser}
              className="bg-red-500 hover:bg-red-600"
            >
              Eliminar mi usuario
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
