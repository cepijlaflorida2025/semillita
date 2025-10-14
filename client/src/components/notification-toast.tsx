import { useEffect, useState } from "react";
import { CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NotificationToastProps {
  message: string;
  isVisible: boolean;
  onHide: () => void;
  type?: 'success' | 'error' | 'info';
  duration?: number; // in milliseconds
}

export default function NotificationToast({
  message,
  isVisible,
  onHide,
  type = 'success',
  duration = 3000
}: NotificationToastProps) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      const timer = setTimeout(() => {
        onHide();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      // Delay unmounting to allow exit animation
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onHide, duration]);

  if (!shouldRender) {
    return null;
  }

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-primary text-primary-foreground';
      case 'error':
        return 'bg-destructive text-destructive-foreground';
      case 'info':
        return 'bg-accent text-accent-foreground';
      default:
        return 'bg-primary text-primary-foreground';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <X className="w-5 h-5" />;
      default:
        return <CheckCircle className="w-5 h-5" />;
    }
  };

  return (
    <div
      className={cn(
        "fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg transition-all duration-300 max-w-sm mx-4",
        getToastStyles(),
        isVisible 
          ? "translate-y-0 opacity-100 scale-100" 
          : "-translate-y-2 opacity-0 scale-95"
      )}
      data-testid="notification-toast"
    >
      <div className="flex items-center space-x-3">
        {getIcon()}
        <span className="font-semibold text-sm flex-1">{message}</span>
        <Button
          size="icon"
          variant="ghost"
          className="w-6 h-6 text-current hover:bg-white/20"
          onClick={onHide}
          data-testid="button-close-toast"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
