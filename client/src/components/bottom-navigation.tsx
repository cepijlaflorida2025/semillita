import { useLocation } from "wouter";
import { Home, Leaf, Plus, Trophy, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function BottomNavigation() {
  const [location, setLocation] = useLocation();

  const navItems = [
    {
      id: 'home',
      label: 'Inicio',
      icon: Home,
      path: '/dashboard',
      isActive: location === '/' || location === '/dashboard',
    },
    {
      id: 'plant',
      label: 'Jardín',
      icon: Leaf,
      path: '/plant',
      isActive: location === '/plant',
    },
    {
      id: 'new',
      label: 'Nuevo',
      icon: Plus,
      path: '/new-entry',
      isActive: location === '/new-entry',
      isPrimary: true,
    },
    {
      id: 'achievements',
      label: 'Logros',
      icon: Trophy,
      path: '/achievements',
      isActive: location === '/achievements',
    },
    {
      id: 'store',
      label: 'Tienda',
      icon: ShoppingBag,
      path: '/store',
      isActive: location === '/store',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-card border-t border-border">
      <div className="flex justify-around py-3 px-2">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          
          if (item.isPrimary) {
            return (
              <Button
                key={item.id}
                onClick={() => setLocation(item.path)}
                className="flex flex-col items-center space-y-1 bg-primary text-primary-foreground px-4 py-2 rounded-full -mt-2 shadow-lg min-h-14"
                data-testid={`nav-${item.id}`}
              >
                <IconComponent className="w-5 h-5" />
                <span className="text-xs font-semibold">{item.label}</span>
              </Button>
            );
          }
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => setLocation(item.path)}
              className={cn(
                "flex flex-col items-center space-y-1 text-muted-foreground transition-all hover:text-primary min-h-14 px-3",
                item.isActive && "text-primary bg-primary/5"
              )}
              data-testid={`nav-${item.id}`}
            >
              <IconComponent className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
