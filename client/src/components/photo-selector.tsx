import { useState } from "react";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PhotoEntry {
  id: string;
  photoUrl: string | null;
  createdAt: string;
  emotion?: {
    emoji: string;
    name: string;
  };
}

interface PhotoSelectorProps {
  entries: PhotoEntry[];
  onSelect: (photoUrl: string) => void;
  onClose: () => void;
  currentPhotoUrl?: string;
}

export default function PhotoSelector({ entries, onSelect, onClose, currentPhotoUrl }: PhotoSelectorProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(currentPhotoUrl || null);

  // Filter entries that have photos
  const entriesWithPhotos = entries.filter(entry => entry.photoUrl);

  const handleConfirm = () => {
    if (selectedPhoto) {
      onSelect(selectedPhoto);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-background z-10">
          <div>
            <h2 className="text-xl font-bold">Seleccionar Foto</h2>
            <p className="text-sm text-muted-foreground">
              Elige una foto de tu bitácora para mostrar en el dashboard
            </p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {entriesWithPhotos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No hay fotos en tu bitácora aún</p>
              <p className="text-sm text-muted-foreground mt-2">
                Crea entradas con fotos para poder seleccionarlas aquí
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {entriesWithPhotos.map((entry) => (
                <Card
                  key={entry.id}
                  className={`cursor-pointer transition-all hover-elevate ${
                    selectedPhoto === entry.photoUrl
                      ? 'ring-2 ring-primary ring-offset-2'
                      : ''
                  }`}
                  onClick={() => setSelectedPhoto(entry.photoUrl)}
                >
                  <CardContent className="p-2">
                    <div className="relative">
                      <img
                        src={entry.photoUrl!}
                        alt="Foto de bitácora"
                        className="w-full h-40 object-cover rounded-md"
                      />
                      {selectedPhoto === entry.photoUrl && (
                        <div className="absolute top-2 right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                      )}
                      {entry.emotion && (
                        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1 flex items-center space-x-1">
                          <span className="text-lg">{entry.emotion.emoji}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      {new Date(entry.createdAt).toLocaleDateString('es', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {entriesWithPhotos.length > 0 && (
          <div className="p-4 border-t bg-background flex space-x-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedPhoto}
              className="flex-1"
            >
              Confirmar Selección
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
