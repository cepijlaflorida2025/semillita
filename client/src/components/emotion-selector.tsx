import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Emotion {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description?: string;
}

interface EmotionSelectorProps {
  emotions: Emotion[];
  selectedId?: string;
  onSelect: (emotionId: string) => void;
  className?: string;
}

export default function EmotionSelector({ 
  emotions, 
  selectedId, 
  onSelect,
  className 
}: EmotionSelectorProps) {
  const getEmotionBgColor = (color: string, isSelected: boolean) => {
    const baseClass = isSelected ? 'ring-2 ring-primary shadow-lg' : '';
    
    switch (color.toLowerCase()) {
      case 'yellow':
        return cn('bg-yellow-100 hover:bg-yellow-200', baseClass);
      case 'blue':
        return cn('bg-blue-100 hover:bg-blue-200', baseClass);
      case 'red':
        return cn('bg-red-100 hover:bg-red-200', baseClass);
      case 'green':
        return cn('bg-green-100 hover:bg-green-200', baseClass);
      case 'purple':
        return cn('bg-purple-100 hover:bg-purple-200', baseClass);
      case 'orange':
        return cn('bg-orange-100 hover:bg-orange-200', baseClass);
      case 'pink':
        return cn('bg-pink-100 hover:bg-pink-200', baseClass);
      case 'gray':
        return cn('bg-gray-100 hover:bg-gray-200', baseClass);
      default:
        return cn('bg-muted hover:bg-muted/80', baseClass);
    }
  };

  if (!emotions || emotions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No hay emociones disponibles</p>
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-4 gap-3", className)}>
      {emotions.map((emotion) => (
        <Button
          key={emotion.id}
          variant="ghost"
          className={cn(
            "emotion-button h-auto p-4 rounded-xl text-center transition-all active:scale-95 hover:scale-105",
            getEmotionBgColor(emotion.color, selectedId === emotion.id)
          )}
          onClick={() => onSelect(emotion.id)}
          data-testid={`button-emotion-${emotion.id}`}
        >
          <div className="flex flex-col items-center space-y-1">
            <span className="text-3xl leading-none" role="img" aria-label={emotion.name}>
              {emotion.emoji}
            </span>
            <span className="text-xs font-semibold leading-tight">
              {emotion.name}
            </span>
          </div>
        </Button>
      ))}
    </div>
  );
}
