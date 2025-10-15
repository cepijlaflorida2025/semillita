import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Users, ArrowRight, LogOut, HelpCircle, Search, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

  const { data: dashboardData, isLoading, error } = useQuery<FacilitatorDashboardData>({
    queryKey: [`/api/facilitator/dashboard`],
    enabled: !!currentUser?.id && currentUser?.role === 'facilitator',
    refetchInterval: 30000, // Refetch every 30 seconds (reduced from 10s to avoid timeouts)
    staleTime: 20000, // Consider data stale after 20 seconds
    retry: 1, // Retry failed requests once
    retryDelay: 1000, // Wait 1 second between retries
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

  const handleLogout = () => {
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

  const hasActiveFilters = searchTerm || emotionFilter;

  // Early returns AFTER all hooks
  if (!currentUser || currentUser.role !== 'facilitator') {
    setLocation('/welcome');
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">
          <Users className="w-8 h-8 text-primary" />
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
    <div className="min-h-screen bg-background">
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
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 text-white" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters Card */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Filtros</h3>
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
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
          </CardContent>
        </Card>

        {/* Stats Card */}
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
                        <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                          <span>{child.age} años</span>
                          <span>•</span>
                          <span>{child.journalEntriesCount} entradas</span>
                          <span>•</span>
                          <span>{child.points} pts</span>
                        </div>
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
    </div>
  );
}
