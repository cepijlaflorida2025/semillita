import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, QrCode, Camera, Share2, Copy, Sprout, MapPin, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import CameraCapture from "@/components/camera-capture";
import BottomNavigation from "@/components/bottom-navigation";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useStorage } from "@/hooks/use-storage";

const seedSchema = z.object({
  type: z.string().min(1, "El tipo de semilla es requerido"),
  origin: z.string().optional(),
  notes: z.string().optional(),
});

type SeedForm = z.infer<typeof seedSchema>;

export default function SeedVault() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { currentUser } = useStorage();
  const [showCamera, setShowCamera] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<File | null>(null);
  const [showQR, setShowQR] = useState<string | null>(null);

  const { data: seeds, isLoading } = useQuery({
    queryKey: ['/api/users', currentUser?.id, 'seeds'],
    enabled: !!currentUser?.id,
  });

  const form = useForm<SeedForm>({
    resolver: zodResolver(seedSchema),
    defaultValues: {
      type: "",
      origin: "",
      notes: "",
    },
  });

  const createSeedMutation = useMutation({
    mutationFn: async (data: SeedForm) => {
      const formData = new FormData();
      formData.append('userId', currentUser!.id);
      formData.append('type', data.type);
      formData.append('origin', data.origin || '');
      formData.append('notes', data.notes || '');
      formData.append('isShared', 'true');
      
      if (capturedPhoto) {
        formData.append('photo', capturedPhoto);
      }

      const response = await apiRequest('POST', '/api/seeds', formData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', currentUser?.id, 'seeds'] });
      toast({
        title: "¡Semilla guardada!",
        description: "Tu semilla se ha añadido al guardador",
      });
      setShowAddDialog(false);
      setCapturedPhoto(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo guardar la semilla. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  const handlePhotoCapture = (photoFile: File) => {
    setCapturedPhoto(photoFile);
    setShowCamera(false);
  };

  const onSubmit = (data: SeedForm) => {
    createSeedMutation.mutate(data);
  };

  const copyShareCode = async (shareCode: string) => {
    try {
      await navigator.clipboard.writeText(shareCode);
      toast({
        title: "¡Código copiado!",
        description: "Comparte este código con otros niños",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar el código",
        variant: "destructive",
      });
    }
  };

  const generateQRCode = (shareCode: string) => {
    // In a real implementation, you'd use a QR code library
    // For now, we'll show the share code
    setShowQR(shareCode);
  };

  if (!currentUser) {
    setLocation('/welcome');
    return null;
  }

  if (showCamera) {
    return (
      <CameraCapture
        onCapture={handlePhotoCapture}
        onClose={() => setShowCamera(false)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">
          <Sprout className="w-8 h-8 text-primary" />
        </div>
      </div>
    );
  }

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
                  <Sprout className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Mi Guardador de Semillas</h1>
                  <p className="text-xs opacity-90">{seeds?.length || 0} semillas guardadas</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Próximamente Alert */}
        <Card className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <p className="font-bold text-yellow-800 dark:text-yellow-200 mb-1">Próximamente</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Esta sección está en desarrollo. Cualquier registro que hagas aquí no se guardará permanentemente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Seed Button */}
        <div className="flex justify-end mb-4">
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button
                size="default"
                className="bg-primary hover:bg-primary/90"
                data-testid="button-add-seed"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar semilla
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Agregar Nueva Semilla</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de semilla</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ej: Tomate, Girasol, Albahaca"
                            {...field}
                            data-testid="input-seed-type"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="origin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Origen (opcional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="¿De dónde viene?"
                            {...field}
                            data-testid="input-seed-origin"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas (opcional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Notas especiales sobre esta semilla"
                            {...field}
                            data-testid="textarea-seed-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Photo */}
                  <div>
                    <FormLabel>Foto</FormLabel>
                    {capturedPhoto ? (
                      <div className="mt-2">
                        <img
                          src={URL.createObjectURL(capturedPhoto)}
                          alt="Foto de semilla"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full mt-2 h-20 border-dashed"
                        onClick={() => setShowCamera(true)}
                        data-testid="button-take-seed-photo"
                      >
                        <Camera className="w-5 h-5 mr-2" />
                        Tomar foto
                      </Button>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      type="submit"
                      disabled={createSeedMutation.isPending}
                      className="flex-1"
                      data-testid="button-save-seed"
                    >
                      {createSeedMutation.isPending ? 'Guardando...' : 'Guardar semilla'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddDialog(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Info Card */}
        <Card className="bg-secondary/10 border-secondary/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center">
                <Sprout className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="font-semibold text-secondary-foreground">Guardador de Semillas</p>
                <p className="text-xs text-muted-foreground">
                  Guarda y comparte semillas con otros niños usando códigos QR
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seeds Grid */}
        {seeds && seeds.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Mis Semillas</h2>
            <div className="grid gap-4">
              {seeds.map((seed: any) => (
                <Card key={seed.id} className="hover-elevate" data-testid={`card-seed-${seed.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      {seed.photoUrl ? (
                        <img
                          src={seed.photoUrl}
                          alt={seed.type}
                          className="w-16 h-16 object-cover rounded-lg border-2 border-border"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center border-2 border-border">
                          <Sprout className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground">{seed.type}</h3>
                        {seed.origin && (
                          <p className="text-sm text-muted-foreground flex items-center mt-1">
                            <MapPin className="w-3 h-3 mr-1" />
                            {seed.origin}
                          </p>
                        )}
                        {seed.notes && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {seed.notes}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Guardada el {new Date(seed.createdAt).toLocaleDateString('es')}
                        </p>
                      </div>
                      <div className="flex flex-col space-y-2">
                        {seed.shareCode && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyShareCode(seed.shareCode)}
                              data-testid={`button-copy-${seed.id}`}
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copiar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => generateQRCode(seed.shareCode)}
                              data-testid={`button-qr-${seed.id}`}
                            >
                              <QrCode className="w-3 h-3 mr-1" />
                              QR
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <Sprout className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              Aún no tienes semillas guardadas
            </h3>
            <p className="text-muted-foreground mb-6">
              Guarda tus semillas favoritas para compartir con otros niños
            </p>
            <Button
              onClick={() => setShowAddDialog(true)}
              data-testid="button-add-first-seed"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar mi primera semilla
            </Button>
          </div>
        )}

        {/* How to Share */}
        {seeds && seeds.length > 0 && (
          <Card className="bg-accent/10 border-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center text-accent-foreground">
                <Share2 className="w-5 h-5 mr-2" />
                Cómo Compartir
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start space-x-3">
                  <Badge className="bg-accent/20 text-accent-foreground">1</Badge>
                  <p>Toca "Copiar" para obtener el código de tu semilla</p>
                </div>
                <div className="flex items-start space-x-3">
                  <Badge className="bg-accent/20 text-accent-foreground">2</Badge>
                  <p>Comparte el código con otros niños en talleres o actividades</p>
                </div>
                <div className="flex items-start space-x-3">
                  <Badge className="bg-accent/20 text-accent-foreground">3</Badge>
                  <p>Usa el código QR para compartir rápidamente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* QR Code Dialog */}
      {showQR && (
        <Dialog open={!!showQR} onOpenChange={() => setShowQR(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Código para Compartir</DialogTitle>
            </DialogHeader>
            <div className="text-center p-6">
              <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
                <div className="text-center">
                  <QrCode className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Código QR aquí</p>
                </div>
              </div>
              <div className="bg-primary/10 rounded-lg p-3 mb-4">
                <p className="font-mono text-lg font-bold text-primary">{showQR}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Comparte este código con otros niños para que puedan ver tu semilla
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <BottomNavigation />
    </div>
  );
}
