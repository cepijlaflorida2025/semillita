import { Menu, HelpCircle, ArrowLeft, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useStorage } from "@/hooks/use-storage";
import opcionIsollogo from "@assets/isologo_opcion_1758035535543.png";

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

interface AppHeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  backTo?: string;
  onBackClick?: () => void;
  showHelpButton?: boolean;
  showLogoutButton?: boolean;
  onLogoutClick?: () => void;
  variant?: 'default' | 'gradient';
  className?: string;
  children?: React.ReactNode;
}

export default function AppHeader({ 
  onMenuClick, 
  showMenuButton = false, 
  title,
  subtitle,
  showBackButton = false,
  backTo,
  onBackClick,
  showHelpButton = false,
  showLogoutButton = false,
  onLogoutClick,
  variant = 'default',
  className = "",
  children
}: AppHeaderProps) {
  const [, setLocation] = useLocation();
  const { currentUser } = useStorage();
  
  // Get user's avatar and color theme
  const userAvatar = currentUser?.avatar ? AVATAR_OPTIONS.find(a => a.id === currentUser.avatar) : null;
  const userColorTheme = currentUser?.colorTheme ? COLOR_THEMES.find(c => c.id === currentUser.colorTheme) || COLOR_THEMES[0] : COLOR_THEMES[0];

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else if (backTo) {
      setLocation(backTo);
    }
  };

  const handleHelpClick = () => {
    setLocation('/help');
  };

  const headerClasses = variant === 'gradient' 
    ? "bg-gradient-to-r from-primary to-accent text-primary-foreground p-4 rounded-b-xl shadow-lg"
    : "bg-transparent p-3";

  const textColorClasses = variant === 'gradient'
    ? "text-white"
    : "text-foreground";

  const buttonClasses = variant === 'gradient'
    ? "text-white hover:bg-white/20"
    : "text-muted-foreground hover:text-foreground";

  return (
    <header className={`flex items-center justify-between ${headerClasses} ${className}`}>
      {/* Left section with back button, menu and OPCIÓN logo */}
      <div className="flex items-center space-x-3">
        {/* Back Button */}
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackClick}
            data-testid="button-back"
            className={buttonClasses}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}

        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            data-testid="button-menu"
            className={`md:hidden ${buttonClasses}`}
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}
        
        {/* User Avatar or OPCIÓN Isologo */}
        <div className="flex items-center space-x-2">
          {userAvatar ? (
            <div className={`w-8 h-8 md:w-10 md:h-10 ${userColorTheme.color} rounded-full flex items-center justify-center shadow-lg`} data-testid="div-user-avatar">
              <span className="text-lg md:text-xl">{userAvatar.emoji}</span>
            </div>
          ) : (
            <img 
              src={opcionIsollogo} 
              alt="OPCIÓN por los derechos de niñas y niños"
              className="w-8 h-8 md:w-10 md:h-10"
              data-testid="img-opcion-logo"
            />
          )}
          {title && (
            <div className="hidden sm:block">
              <h1 className={`text-lg font-bold ${textColorClasses}`} data-testid="text-header-title">{title}</h1>
              {subtitle ? (
                <p className={`text-xs ${variant === 'gradient' ? 'opacity-90' : 'text-muted-foreground'}`}>
                  {subtitle}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Center section - App title for mobile when no sidebar title */}
      {!title && (
        <div className="flex-1 text-center sm:hidden">
          <h1 className={`text-lg font-bold ${textColorClasses}`}>Semillita</h1>
        </div>
      )}

      {/* Right section with action buttons */}
      <div className="flex items-center space-x-2">
        {children}
        
        {showLogoutButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onLogoutClick}
            data-testid="button-logout"
            className={buttonClasses}
          >
            <LogOut className="w-5 h-5" />
          </Button>
        )}

        {showHelpButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleHelpClick}
            data-testid="button-help"
            className={buttonClasses}
          >
            <HelpCircle className="w-5 h-5" />
          </Button>
        )}
      </div>
    </header>
  );
}