import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Coins,
  ShoppingBag,
  Sparkles,
  Star,
  Leaf,
  Book,
  Gift,
  Award,
  User,
  Image,
  FileText,
  Sprout,
  Trophy,
  CheckCircle,
  ArrowLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { useStorage } from '@/hooks/use-storage';
import type { Reward, UserReward } from '@shared/schema';

export default function Store() {
  const [, setLocation] = useLocation();
  const { currentUser: user, updateUser } = useStorage();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Fetch available rewards
  const { data: rewards = [], isLoading: rewardsLoading } = useQuery<Reward[]>({
    queryKey: ['/api/rewards'],
    enabled: !!user,
  });

  // Fetch user's purchased rewards
  const { data: userRewards = [], isLoading: userRewardsLoading } = useQuery<UserReward[]>({
    queryKey: ['/api/users', user?.id, 'rewards'],
    enabled: !!user,
  });

  // Fetch dashboard data for accurate points
  const { data: dashboardData } = useQuery({
    queryKey: [`/api/dashboard/${user?.id}`],
    enabled: !!user?.id,
  });

  // Purchase reward mutation
  const purchaseReward = useMutation({
    mutationFn: async (rewardId: string) => {
      const response = await fetch(`/api/rewards/${rewardId}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al comprar recompensa');
      }

      return response.json();
    },
    onSuccess: (data, rewardId) => {
      // Find the reward that was purchased to get the cost
      const purchasedReward = rewards.find(r => r.id === rewardId);
      if (purchasedReward && user) {
        // Update user points in local storage
        updateUser({ points: user.points - purchasedReward.pointsCost });
      }
      
      toast({
        title: 'Recompensa obtenida',
        description: 'Tu nueva recompensa se ha agregado a tu colección.',
      });
      // Invalidate both user data (for points) and rewards data
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', user?.id, 'rewards'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto p-4">
        <div className="text-center py-8">
          <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-semibold mb-2">Inicia sesión para ver la tienda</h2>
          <p className="text-muted-foreground">Necesitas una cuenta para ganar y gastar puntos</p>
        </div>
      </div>
    );
  }

  const purchasedRewardIds = new Set(userRewards.map(ur => ur.rewardId));

  // Use dashboard data for user points
  const userPoints = dashboardData?.user?.points || user?.points || 0;

  const categories = [
    { id: 'all', name: 'Todos', icon: Star },
    { id: 'stickers', name: 'Stickers', icon: Leaf },
    { id: 'guides', name: 'Guías', icon: Book },
    { id: 'items', name: 'Artículos', icon: Gift },
    { id: 'badges', name: 'Insignias', icon: Award },
    { id: 'avatars', name: 'Avatares', icon: User },
    { id: 'backgrounds', name: 'Fondos', icon: Image },
  ];

  const filteredRewards = selectedCategory === 'all' 
    ? rewards 
    : rewards.filter(reward => reward.category === selectedCategory);

  const isLoading = rewardsLoading || userRewardsLoading;

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
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Tienda</h1>
                  <p className="text-xs opacity-90">Recompensas increíbles</p>
                </div>
              </div>
              <Badge className="bg-white bg-opacity-20 text-white font-semibold">
                <Coins className="w-3 h-3 mr-1" />
                {userPoints} pts
              </Badge>
            </div>
          </CardContent>
        </Card>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 justify-center">
        {categories.map((category) => {
          const IconComponent = category.icon;
          return (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              data-testid={`button-category-${category.id}`}
              className="rounded-full"
            >
              <IconComponent className="h-4 w-4 mr-1" />
              {category.name}
            </Button>
          );
        })}
      </div>

      {/* Rewards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }, (_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded mb-4"></div>
                <div className="h-10 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRewards.map((reward) => {
            const isPurchased = purchasedRewardIds.has(reward.id);
            const canAfford = userPoints >= reward.pointsCost;
            
            return (
              <Card 
                key={reward.id} 
                className={`transition-all duration-200 hover-elevate ${
                  isPurchased ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : ''
                }`}
                data-testid={`card-reward-${reward.id}`}
              >
                <CardHeader className="text-center">
                  <div className="text-4xl mb-2">
                    {reward.category === 'stickers' && <Leaf className="h-12 w-12 mx-auto text-green-500" />}
                    {reward.category === 'guides' && <Book className="h-12 w-12 mx-auto text-blue-500" />}
                    {reward.category === 'items' && <Gift className="h-12 w-12 mx-auto text-purple-500" />}
                    {reward.category === 'badges' && <Award className="h-12 w-12 mx-auto text-yellow-500" />}
                    {reward.category === 'avatars' && <User className="h-12 w-12 mx-auto text-pink-500" />}
                    {reward.category === 'backgrounds' && <Image className="h-12 w-12 mx-auto text-indigo-500" />}
                    {!reward.category && <Star className="h-12 w-12 mx-auto text-primary" />}
                  </div>
                  <CardTitle className="text-lg">{reward.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {reward.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Price */}
                  <div className="flex items-center justify-center gap-2">
                    <Coins className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-lg" data-testid={`text-price-${reward.id}`}>
                      {reward.pointsCost} puntos
                    </span>
                  </div>
                  
                  {/* Category Badge */}
                  <div className="flex justify-center">
                    <Badge variant="secondary" className="rounded-full flex items-center gap-1">
                      {(() => {
                        const category = categories.find(c => c.id === reward.category);
                        const IconComponent = category?.icon || Star;
                        return (
                          <>
                            <IconComponent className="h-3 w-3" />
                            {category?.name || reward.category}
                          </>
                        );
                      })()}
                    </Badge>
                  </div>
                  
                  {/* Purchase Button */}
                  <div className="pt-2">
                    {isPurchased ? (
                      <Button 
                        disabled 
                        className="w-full bg-green-600 hover:bg-green-700"
                        data-testid={`button-purchased-${reward.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Obtenida
                      </Button>
                    ) : (
                      <Button
                        onClick={() => purchaseReward.mutate(reward.id)}
                        disabled={!canAfford || purchaseReward.isPending}
                        className="w-full"
                        data-testid={`button-purchase-${reward.id}`}
                      >
                        {purchaseReward.isPending ? (
                          'Comprando...'
                        ) : canAfford ? (
                          <>
                            <ShoppingBag className="h-4 w-4 mr-1" />
                            Comprar
                          </>
                        ) : (
                          `Necesitas ${reward.pointsCost - userPoints} puntos más`
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredRewards.length === 0 && (
        <div className="text-center py-12">
          <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No hay recompensas disponibles</h3>
          <p className="text-muted-foreground">
            Intenta seleccionar una categoría diferente
          </p>
        </div>
      )}

      </div>

      {/* How to Earn Points */}
      <div className="p-4">
      <Card className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950 dark:to-green-950 border-blue-200 dark:border-blue-800">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5" />
            ¿Cómo ganar más puntos?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <span><strong>Escribe en tu diario:</strong> 10 puntos por entrada</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Sprout className="h-5 w-5 text-green-500" />
            <span><strong>Cuida tu planta:</strong> Puntos por cada acción de cuidado</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span><strong>Completa logros:</strong> Puntos bonus por milestones</span>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}