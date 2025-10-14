import { Calendar, TrendingUp, Star, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";

interface PlantProgressProps {
  daysSincePlanting: number;
  entriesCount: number;
  milestones?: string[];
}

export default function PlantProgress({ 
  daysSincePlanting, 
  entriesCount,
  milestones = []
}: PlantProgressProps) {
  // Calculate progress towards different goals
  const weeklyGoal = 7; // 7 days
  const monthlyGoal = 30; // 30 days
  const entriesGoal = 10; // 10 entries
  
  const weeklyProgress = Math.min((daysSincePlanting / weeklyGoal) * 100, 100);
  const monthlyProgress = Math.min((daysSincePlanting / monthlyGoal) * 100, 100);
  const entriesProgress = Math.min((entriesCount / entriesGoal) * 100, 100);
  
  const progressData = [
    {
      label: 'Meta Semanal',
      value: weeklyProgress,
      current: daysSincePlanting,
      target: weeklyGoal,
      unit: 'días',
      icon: Calendar,
      color: 'text-primary',
    },
    {
      label: 'Meta Mensual',
      value: monthlyProgress,
      current: daysSincePlanting,
      target: monthlyGoal,
      unit: 'días',
      icon: TrendingUp,
      color: 'text-accent-foreground',
    },
    {
      label: 'Entradas',
      value: entriesProgress,
      current: entriesCount,
      target: entriesGoal,
      unit: 'entradas',
      icon: Star,
      color: 'text-secondary-foreground',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Progress Overview */}
      <div className="grid gap-3">
        {progressData.map((item) => {
          const IconComponent = item.icon;
          const isCompleted = item.value >= 100;
          
          return (
            <Card key={item.label} className={isCompleted ? 'bg-primary/5 border-primary/20' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <IconComponent className={`w-4 h-4 ${isCompleted ? 'text-primary' : item.color}`} />
                    <span className={`text-sm font-semibold ${isCompleted ? 'text-primary' : 'text-foreground'}`}>
                      {item.label}
                    </span>
                  </div>
                  <Badge 
                    variant={isCompleted ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {isCompleted ? (
                      <div className="flex items-center">
                        <Award className="w-3 h-3 mr-1" />
                        ¡Completado!
                      </div>
                    ) : (
                      `${item.current}/${item.target} ${item.unit}`
                    )}
                  </Badge>
                </div>
                
                <Progress 
                  value={item.value} 
                  className="h-2"
                />
                
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(item.value)}% completado
                  {!isCompleted && item.current < item.target && (
                    ` • ${item.target - item.current} ${item.unit} restantes`
                  )}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Next Milestone */}
      <Card className="bg-accent/5 border-accent/20">
        <CardContent className="p-4">
          <h3 className="font-semibold text-accent-foreground mb-2 flex items-center">
            <TrendingUp className="w-4 h-4 mr-2" />
            Próximo Hito
          </h3>
          <div className="space-y-2">
            {daysSincePlanting < 7 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Primera semana</span>
                <Badge variant="outline">{7 - daysSincePlanting} días</Badge>
              </div>
            )}
            {daysSincePlanting >= 7 && daysSincePlanting < 14 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Dos semanas cultivando</span>
                <Badge variant="outline">{14 - daysSincePlanting} días</Badge>
              </div>
            )}
            {daysSincePlanting >= 14 && daysSincePlanting < 30 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Primer mes</span>
                <Badge variant="outline">{30 - daysSincePlanting} días</Badge>
              </div>
            )}
            {entriesCount < 5 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">5 entradas</span>
                <Badge variant="outline">{5 - entriesCount} entradas</Badge>
              </div>
            )}
            {entriesCount >= 5 && entriesCount < 10 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">10 entradas</span>
                <Badge variant="outline">{10 - entriesCount} entradas</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Celebration for achievements */}
      {(weeklyProgress >= 100 || monthlyProgress >= 100 || entriesProgress >= 100) && (
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="p-4 text-center">
            <Award className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="font-semibold text-primary">¡Excelente trabajo!</p>
            <p className="text-xs text-muted-foreground">
              Has alcanzado una meta importante. ¡Sigue cuidando tu planta!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
