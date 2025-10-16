import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Users, ArrowRight, LogOut, HelpCircle, Search, X, Settings, HardDrive, RefreshCw, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { useStorage } from "@/hooks/use-storage";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface ChildData {
  id: string;
  alias: string;
  age: number;
  latestEmotion: {
    emoji: string;
    name: string;
  } | null;
  journalEntriesCount: number;
  points: number;
  createdAt: string;
  storageUsed?: {
    fileCount: number;
    estimatedSizeMB: number;
  };
}

interface FacilitatorDashboardData {
  facilitator: any;
  children: ChildData[];
}

export default function FacilitatorDashboard() {
  const { currentUser, clearStorage } = useStorage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [emotionFilter, setEmotionFilter] = useState("");
  const [sortBy, setSortBy] = useState<'name' | 'entries' | 'points'>('name');

  // Dialog states
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  // Loading progress tracking
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingSteps, setLoadingSteps] = useState<string[]>([]);

  // Accessibility settings
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');

  // Load accessibility settings from user data
  useEffect(() => {
    if (currentUser?.accessibilitySettings) {
      const settings = currentUser.accessibilitySettings as { fontSize?: 'small' | 'medium' | 'large' };
      if (settings.fontSize) {
        setFontSize(settings.fontSize);
      }
    }
  }, [currentUser?.accessibilitySettings]);

  const { data: dashboardData, isLoading, error } = useQuery<FacilitatorDashboardData>({
    queryKey: [`/api/facilitator/dashboard`],
    enabled: !!currentUser?.id && currentUser?.role === 'facilitator',
    refetchInterval: false, // Disable auto-refetch in development to reduce server load
    staleTime: 60000, // Consider data stale after 60 seconds
    retry: 3, // Retry failed requests 3 times (more resilient for local dev)
    retryDelay: 2000, // Wait 2 seconds between retries (more time for slow connections)
  });

  // Debugging: log currentUser and dashboard fetch trigger
  if (process.env.NODE_ENV === 'development') {
    console.log('🐞 [FACILITATOR] currentUser:', currentUser);
    console.log('🐞 [FACILITATOR] query enabled:', !!currentUser?.id && currentUser?.role === 'facilitator');
  }

  // Fetch emotions list
  const { data: emotionsData } = useQuery<Array<{ id: string; name: string; emoji: string; color: string }>>({
    queryKey: ['/api/emotions'],
    enabled: !!currentUser?.id,
  });

  // Fetch storage statistics
  const { data: storageStats, refetch: refetchStorageStats, isLoading: isLoadingStorage } = useQuery<{
    totalSizeBytes: number;
    totalSizeMB: number;
    fileCount: number;
    bucketName: string;
  }>({
    queryKey: ['/api/storage/stats'],
    enabled: !!currentUser?.id && currentUser?.role === 'facilitator',
    staleTime: 60000, // Consider data stale after 60 seconds
  });

  // Track loading progress
  useEffect(() => {
    if (isLoading) {
      setLoadingProgress(33);
      setLoadingSteps(['⏳ Cargando datos de niños...']);
    }
    if (dashboardData) {
      setLoadingSteps(prev => [...prev, '✓ Datos de niños cargados']);
      setLoadingProgress(66);
    }
  }, [isLoading, dashboardData]);

  useEffect(() => {
    if (isLoadingStorage) {
      setLoadingSteps(prev => [...prev, '⏳ Calculando almacenamiento...']);
    }
    if (storageStats) {
      setLoadingSteps(prev => [...prev, '✓ Estadísticas de almacenamiento listas']);
      setLoadingProgress(100);
    }
  }, [isLoadingStorage, storageStats]);

  useEffect(() => {
    if (emotionsData) {
      setLoadingSteps(prev => [...prev, '✓ Emociones cargadas']);
    }
  }, [emotionsData]);

  const confirmLogout = () => {
    toast({
      title: "¡Hasta pronto!",
      description: "Has cerrado sesión correctamente.",
    });

    queryClient.clear();
    clearStorage();

    setTimeout(() => {
      setLocation('/welcome');
    }, 100);
  };

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

  const handleViewChild = (childId: string) => {
    setLocation(`/facilitator/child/${childId}`);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setEmotionFilter("");
  };

  // Compute derived state before early returns
  const allChildren = dashboardData?.children || [];
  const emotions = emotionsData || [];

  // Filtered children based on search and emotion
  let filteredChildren = allChildren;

  // Filter by search term (name)
  if (searchTerm.trim()) {
    filteredChildren = filteredChildren.filter(child =>
      child.alias.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Filter by emotion
  if (emotionFilter) {
    filteredChildren = filteredChildren.filter(child =>
      child.latestEmotion?.name === emotionFilter
    );
  }

  // Sort children
  filteredChildren = [...filteredChildren].sort((a, b) => {
    switch (sortBy) {
      case 'entries':
        return b.journalEntriesCount - a.journalEntriesCount;
      case 'points':
        return b.points - a.points;
      case 'name':
      default:
        return a.alias.localeCompare(b.alias);
    }
  });

  const hasActiveFilters = searchTerm || emotionFilter;

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

  // Early returns AFTER all hooks
  if (!currentUser || currentUser.role !== 'facilitator') {
    setLocation('/welcome');
    return null;
  }

  if (isLoading || isLoadingStorage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4">
        <div className="animate-spin">
          <Users className="w-12 h-12 text-primary" />
        </div>
        <div className="w-full max-w-md space-y-4">
          <div className="text-center">
            <p className="text-base font-semibold text-foreground">Cargando dashboard...</p>
            <p className="text-sm text-muted-foreground mt-1">
              {loadingProgress}% completado
            </p>
          </div>

          {/* Progress Bar */}
          <Progress value={loadingProgress} className="w-full" />

          {/* Loading Steps */}
          <div className="space-y-2 text-sm">
            {loadingSteps.map((step, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-muted-foreground animate-in fade-in slide-in-from-left-2"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">Error al cargar el dashboard</p>
            <p className="text-sm text-red-500 mb-4">{error instanceof Error ? error.message : 'Error desconocido'}</p>
            <Button onClick={() => setLocation('/welcome')}>
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background ${getFontSizeClass()}`}>
      <div className="p-4 space-y-6">
        {/* Header Card */}
        <Card className="bg-gradient-to-r from-primary to-accent text-white border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Facilitador</h1>
                  <p className="text-xs opacity-90">Seguimiento</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-8 h-8 bg-white bg-opacity-20 hover:bg-white hover:bg-opacity-30"
                  onClick={() => setLocation('/help')}
                >
                  <HelpCircle className="w-4 h-4 text-white" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-8 h-8 bg-white bg-opacity-20 hover:bg-white hover:bg-opacity-30"
                  onClick={() => setShowSettingsDialog(true)}
                  title="Ajustes"
                >
                  <Settings className="w-4 h-4 text-white" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Storage Stats Card */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <HardDrive className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Almacenamiento</h3>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => refetchStorageStats()}
                  disabled={isLoadingStorage}
                  className="h-8"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingStorage ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {isLoadingStorage ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin">
                    <RefreshCw className="w-6 h-6 text-primary" />
                  </div>
                </div>
              ) : storageStats ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Espacio Utilizado</p>
                      <p className="text-2xl font-bold text-primary">
                        {storageStats.totalSizeMB > 0 ? `~${storageStats.totalSizeMB}` : '0'} MB
                      </p>
                      {storageStats.totalSizeMB > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">Estimado</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Archivos</p>
                      <p className="text-2xl font-bold text-accent-foreground">{storageStats.fileCount}</p>
                    </div>
                  </div>

                  {/* Progress bar - assuming 100MB limit */}
                  {storageStats.totalSizeMB > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Bucket: {storageStats.bucketName}</span>
                        <span>{Math.round((storageStats.totalSizeMB / 100) * 100)}% usado</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary rounded-full h-2 transition-all"
                          style={{ width: `${Math.min((storageStats.totalSizeMB / 100) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No se pudo cargar la información de almacenamiento
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Card - Niños Registrados */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {hasActiveFilters ? 'Niños Filtrados' : 'Total de Niños'}
                </p>
                <p className="text-2xl font-bold text-primary">{filteredChildren.length}</p>
                {hasActiveFilters && allChildren.length !== filteredChildren.length && (
                  <p className="text-xs text-muted-foreground mt-1">
                    de {allChildren.length} totales
                  </p>
                )}
              </div>
              <Users className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        {/* Filters and Sort Card */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Filtros y Ordenamiento</h3>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-8 text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>

            {/* Search by name */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-semibold">
                Buscar:
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Emotion filter */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-semibold">
                Filtrar por emoción:
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={emotionFilter === "" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEmotionFilter("")}
                  className="h-9"
                >
                  Todas
                </Button>
                {emotions.map((emotion) => (
                  <Button
                    key={emotion.id}
                    variant={emotionFilter === emotion.name ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEmotionFilter(emotion.name)}
                    className="h-9"
                  >
                    <span className="mr-1">{emotion.emoji}</span>
                    {emotion.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Sort options */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-semibold">
                Ordenar por:
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={sortBy === "name" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortBy("name")}
                  className="h-9"
                >
                  <ArrowUpDown className="w-3 h-3 mr-1" />
                  Nombre
                </Button>
                <Button
                  variant={sortBy === "entries" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortBy("entries")}
                  className="h-9"
                >
                  <ArrowUpDown className="w-3 h-3 mr-1" />
                  Registros
                </Button>
                <Button
                  variant={sortBy === "points" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortBy("points")}
                  className="h-9"
                >
                  <ArrowUpDown className="w-3 h-3 mr-1" />
                  Puntos
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Children List */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">
            {hasActiveFilters ? 'Resultados' : 'Niños Registrados'}
          </h2>

          {filteredChildren.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {hasActiveFilters
                    ? 'No se encontraron niños con los filtros aplicados'
                    : 'No hay niños registrados aún'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredChildren.map((child) => (
              <Card
                key={child.id}
                className="cursor-pointer hover:shadow-lg transition-all hover-elevate active-elevate-2"
                onClick={() => handleViewChild(child.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      {/* Emotion indicator */}
                      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">
                          {child.latestEmotion?.emoji || '😊'}
                        </span>
                      </div>

                      {/* Child info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">
                            {child.alias}
                          </h3>
                          {child.latestEmotion && (
                            <Badge variant="secondary" className="text-xs">
                              {child.latestEmotion.name}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-muted-foreground mb-2">
                          <span>{child.age} años</span>
                          <span>•</span>
                          <span>{child.journalEntriesCount} entradas</span>
                          <span>•</span>
                          <span>{child.points} pts</span>
                        </div>

                        {/* Storage indicator */}
                        {child.storageUsed && child.storageUsed.fileCount > 0 && (
                          <div className="flex items-center space-x-2">
                            <HardDrive className="w-3 h-3 text-muted-foreground" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                <span>~{child.storageUsed.estimatedSizeMB} MB</span>
                                <span>{child.storageUsed.fileCount} archivos</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1">
                                <div
                                  className="bg-primary rounded-full h-1 transition-all"
                                  style={{
                                    width: `${Math.min((child.storageUsed.estimatedSizeMB / 10) * 100, 100)}%`
                                  }}
                                  title={`${Math.round((child.storageUsed.estimatedSizeMB / 10) * 100)}% de 10MB`}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Arrow */}
                      <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

      </div>

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
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  setShowSettingsDialog(false);
                  setShowLogoutDialog(true);
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar sesión
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
              ¿Estás seguro de que deseas cerrar sesión? Tendrás que ingresar tus credenciales nuevamente para acceder.
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

    </div>
  );
}
