import { useState } from "react";
import { useLocation } from "wouter";
import { LogIn, UserPlus, Sprout, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AppHeader from "@/components/app-header";
import opcionIsollogo from "@assets/isologo_opcion_1758035535543.png";

export default function ModeSelection() {
  const [, setLocation] = useLocation();
  const selectedMode = localStorage.getItem('semillita_mode');

  // Si no hay modo seleccionado, redirigir a welcome
  if (!selectedMode) {
    setLocation('/welcome');
    return null;
  }

  const modeLabel = selectedMode === 'workshop' ? 'En Taller' : 'En Casa';

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title={`Modo: ${modeLabel}`}
        subtitle="Selecciona una opción para continuar"
        showBackButton={true}
        onBackClick={() => setLocation('/welcome')}
        showHelpButton={true}
        variant="gradient"
      />

      <div className="p-4">
        {/* Logo Section */}
        <div className="text-center py-6">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg mx-auto mb-4 p-3">
            <img src={opcionIsollogo} alt="OPCIÓN Isologo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            ¿Qué deseas hacer?
          </h1>
          <p className="text-muted-foreground px-4">
            Elige si ya tienes un perfil o si vas a crear uno nuevo
          </p>
        </div>

        {/* Warning for "En Casa" mode */}
        {selectedMode === 'home' && (
          <Alert className="mb-6 border-yellow-500/50 bg-yellow-500/10">
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              El modo <strong>"En Casa"</strong> está próximamente. Esta función se encuentra actualmente en desarrollo.
            </AlertDescription>
          </Alert>
        )}

        {/* Options */}
        <div className="space-y-4 mt-8">
          {/* Login Option */}
          <Card
            className={`transition-all ${selectedMode === 'home' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg hover-elevate active-elevate-2'}`}
            onClick={() => selectedMode !== 'home' && setLocation('/login')}
            data-testid="card-login"
          >
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{background: 'linear-gradient(135deg, hsl(var(--opcion-blue)), hsl(var(--opcion-magenta)))'}}
                >
                  <LogIn className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-foreground">Iniciar Sesión</CardTitle>
                  <p className="text-sm text-muted-foreground">Ya tengo un perfil creado</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">
                Ingresa con tu usuario y contraseña para acceder a tu bitácora emocional
              </p>
            </CardContent>
          </Card>

          {/* Create Profile Option */}
          <Card
            className={`transition-all ${selectedMode === 'home' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg hover-elevate active-elevate-2'}`}
            onClick={() => selectedMode !== 'home' && setLocation('/register')}
            data-testid="card-create-profile"
          >
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{background: 'linear-gradient(135deg, hsl(var(--opcion-orange)), hsl(var(--opcion-yellow)))'}}
                >
                  <UserPlus className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-foreground">Crear Perfil</CardTitle>
                  <p className="text-sm text-muted-foreground">Es mi primera vez usando Semillita</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">
                Configura tu perfil según tu rol: Niño, Adulto o Facilitador
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="mt-8 bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Sprout className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Modo {modeLabel}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedMode === 'workshop'
                    ? 'Tendrás apoyo del facilitador en cada paso'
                    : 'Podrás explorar a tu propio ritmo'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
