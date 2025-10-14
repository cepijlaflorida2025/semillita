import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Star, Calendar, BookOpen, Sprout, Leaf, Award, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import BottomNavigation from "@/components/bottom-navigation";
import { useStorage } from "@/hooks/use-storage";

interface Achievement {
  id: string;
  name: string;
  description: string;
  iconName: string;
  pointsRequired: number;
  condition: string;
  isActive: boolean;
  earned?: boolean;
  earnedAt?: string;
  progress?: number;
}

export default function Achievements() {
  const [, setLocation] = useLocation();
  const { currentUser } = useStorage();

  const { data: achievements, isLoading } = useQuery({
    queryKey: ['/api/achievements'],
  });

  const { data: userAchievements } = useQuery({
    queryKey: ['/api/users', currentUser?.id, 'achievements'],
    enabled: !!currentUser?.id,
  });

  const { data: dashboardData } = useQuery({
    queryKey: [`/api/dashboard/${currentUser?.id}`],
    enabled: !!currentUser?.id,
  });

  const getAchievementIcon = (iconName: string, earned: boolean = false) => {
    const iconClass = `w-6 h-6 ${earned ? 'text-primary' : 'text-muted-foreground'}`;
    
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

  const getProgressForAchievement = (achievement: Achievement): number => {
    if (!dashboardData?.user) return 0;

    try {
      const condition = JSON.parse(achievement.condition);
      const user = dashboardData.user;
      const plant = dashboardData.plant;

      switch (condition.type) {
        case 'plant_created':
          return plant ? 100 : 0;
        case 'days_caring':
          if (!plant) return 0;
          const daysCaring = Math.floor((Date.now() - new Date(plant.plantedAt).getTime()) / (1000 * 60 * 60 * 24));
          return Math.min((daysCaring / condition.count) * 100, 100);
        case 'journal_entries':
          const entriesCount = user.journalEntriesCount || 0;
          return Math.min((entriesCount / condition.count) * 100, 100);
        case 'points':
          const points = user.points || 0;
          const threshold = condition.threshold || achievement.pointsRequired;
          return Math.min((points / threshold) * 100, 100);
        default:
          return 0;
      }
    } catch {
      return 0;
    }
  };

  if (!currentUser) {
    setLocation('/welcome');
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">
          <Trophy className="w-8 h-8 text-primary" />
        </div>
      </div>
    );
  }

  const earnedAchievements = userAchievements || [];
  const earnedIds = new Set(earnedAchievements.map((ua: any) => ua.achievementId));

  const processedAchievements = (achievements || []).map((achievement: Achievement) => ({
    ...achievement,
    earned: earnedIds.has(achievement.id),
    earnedAt: earnedAchievements.find((ua: any) => ua.achievementId === achievement.id)?.earnedAt,
    progress: getProgressForAchievement(achievement),
  }));

  const earnedCount = earnedAchievements.length;
  const totalCount = processedAchievements.length;

  // Use dashboard data for user points
  const userPoints = dashboardData?.user?.points || currentUser?.points || 0;

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
                  onClick={() => setLocation('/dashboard')}
                  className="w-10 h-10 bg-white bg-opacity-20 hover:bg-white hover:bg-opacity-30"
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </Button>
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center shadow-lg">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Mis Logros</h1>
                  <p className="text-xs opacity-90">{earnedCount} de {totalCount} completados</p>
                </div>
              </div>
              <Badge className="bg-white bg-opacity-20 text-white font-semibold">
                <Star className="w-3 h-3 mr-1" />
                {userPoints} pts
              </Badge>
            </div>
          </CardContent>
        </Card>
        {/* Progress Overview */}
        <Card data-testid="card-progress-overview">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">Tu Progreso</h3>
              <Badge className="bg-primary text-primary-foreground">
                <Star className="w-3 h-3 mr-1" />
                {userPoints} pts
              </Badge>
            </div>
            <Progress value={(earnedCount / totalCount) * 100} className="h-3 mb-2" />
            <p className="text-sm text-muted-foreground">
              {earnedCount} de {totalCount} logros completados ({Math.round((earnedCount / totalCount) * 100)}%)
            </p>
          </CardContent>
        </Card>

        {/* Achievement Categories */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">Todos los Logros</h2>
          
          {/* Earned Achievements */}
          {processedAchievements.filter(a => a.earned).length > 0 && (
            <div className="space-y-3">
              <h3 className="text-md font-semibold text-primary flex items-center">
                <Trophy className="w-4 h-4 mr-2" />
                Completados
              </h3>
              {processedAchievements
                .filter(a => a.earned)
                .map((achievement) => (
                  <Card 
                    key={achievement.id} 
                    className="bg-primary/5 border-primary/30"
                    data-testid={`card-achievement-${achievement.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                          {getAchievementIcon(achievement.iconName, true)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-primary">{achievement.name}</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {achievement.description}
                          </p>
                          {achievement.earnedAt && (
                            <p className="text-xs text-primary">
                              Completado el {new Date(achievement.earnedAt).toLocaleDateString('es')}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge className="bg-primary text-primary-foreground mb-2">
                            ¡Completado!
                          </Badge>
                          {achievement.pointsRequired > 0 && (
                            <p className="text-xs text-muted-foreground">
                              +{achievement.pointsRequired} pts
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}

          {/* In Progress Achievements */}
          {processedAchievements.filter(a => !a.earned && a.progress > 0).length > 0 && (
            <div className="space-y-3">
              <h3 className="text-md font-semibold text-accent-foreground flex items-center">
                <Star className="w-4 h-4 mr-2" />
                En Progreso
              </h3>
              {processedAchievements
                .filter(a => !a.earned && a.progress > 0)
                .map((achievement) => (
                  <Card 
                    key={achievement.id}
                    className="bg-accent/5 border-accent/30"
                    data-testid={`card-achievement-${achievement.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center">
                          {getAchievementIcon(achievement.iconName)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-foreground">{achievement.name}</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {achievement.description}
                          </p>
                          <div className="space-y-1">
                            <Progress value={achievement.progress} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                              {Math.round(achievement.progress)}% completado
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {achievement.pointsRequired > 0 && (
                            <Badge variant="outline">
                              +{achievement.pointsRequired} pts
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}

          {/* Locked Achievements */}
          {processedAchievements.filter(a => !a.earned && a.progress === 0).length > 0 && (
            <div className="space-y-3">
              <h3 className="text-md font-semibold text-muted-foreground flex items-center">
                <Lock className="w-4 h-4 mr-2" />
                Por Desbloquear
              </h3>
              {processedAchievements
                .filter(a => !a.earned && a.progress === 0)
                .map((achievement) => (
                  <Card 
                    key={achievement.id}
                    className="bg-muted/30 border-muted opacity-60"
                    data-testid={`card-achievement-${achievement.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                          <Lock className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-muted-foreground">{achievement.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {achievement.description}
                          </p>
                        </div>
                        <div className="text-right">
                          {achievement.pointsRequired > 0 && (
                            <Badge variant="secondary">
                              +{achievement.pointsRequired} pts
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </div>

        {/* Motivation Message */}
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="p-6 text-center">
            <Trophy className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="font-bold text-foreground mb-2">¡Sigue cultivando!</h3>
            <p className="text-muted-foreground">
              Cada entrada en tu bitácora y cada día cuidando tu planta te acerca a nuevos logros.
            </p>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
}
