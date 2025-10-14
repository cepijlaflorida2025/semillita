import { useState } from "react";
import { useLocation } from "wouter";
import { Sprout, Users, Home, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import opcionLogo from "@assets/texto_opcion_1758044117984.png";
import opcionIsollogo from "@assets/isologo_opcion_1758035535543.png";

export default function Welcome() {
  const [, setLocation] = useLocation();
  const [selectedMode, setSelectedMode] = useState<'workshop' | 'home' | null>(null);

  const handleModeSelection = (mode: 'workshop' | 'home') => {
    setSelectedMode(mode);
    // Save mode selection and proceed to mode selection screen
    localStorage.setItem('semillita_mode', mode);
    setLocation('/mode-selection');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 p-4 flex flex-col">
      {/* Background Decoration */}
      <div className="absolute top-4 right-4 w-24 h-24 opacity-20 pointer-events-none">
        <Sprout className="w-full h-full text-primary float-animation" />
      </div>

      {/* Header with OPCIÓN Branding */}
      <div className="text-center py-6">
        {/* OPCIÓN Logo */}
        <div className="mb-6">
          <img 
            src={opcionLogo} 
            alt="OPCIÓN por los derechos de niñas y niños"
            className="h-12 md:h-16 mx-auto mb-4"
            data-testid="img-opcion-complete-logo"
          />
          <p className="text-sm text-muted-foreground px-4">
            Una iniciativa para el bienestar emocional infantil
          </p>
        </div>
        
        {/* Semillita Branding */}
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg p-2">
            <img src={opcionIsollogo} alt="OPCIÓN Isologo" className="w-full h-full object-contain" />
          </div>
          <div className="text-left">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">¡Bienvenido a Semillita!</h1>
            <p className="text-sm text-muted-foreground">
              Tu bitácora emocional
            </p>
          </div>
        </div>
      </div>

      {/* Objective */}
      <div className="mb-8">
        <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
          <CardContent className="p-6 text-center">
            <Clock className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-bold text-foreground mb-2">Tu Objetivo Inmediato</h3>
            <p className="text-muted-foreground">Crear tu primera entrada emocional</p>
            <Badge variant="secondary" className="mt-3">
              Tiempo estimado: 10 minutos
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Mode Selection */}
      <div className="flex-1 space-y-4">
        <h2 className="text-xl font-bold text-center text-foreground mb-6">
          ¿Dónde te encuentras?
        </h2>

        {/* Workshop Mode */}
        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg hover-elevate active-elevate-2 ${
            selectedMode === 'workshop' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => handleModeSelection('workshop')}
          data-testid="button-workshop-mode"
        >
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{background: 'linear-gradient(135deg, hsl(var(--opcion-orange)), hsl(var(--opcion-blue)))'}}>
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-foreground">En Taller</CardTitle>
                <p className="text-sm text-muted-foreground">Modo guiado con facilitador</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Tutorial paso a paso</li>
              <li>• Apoyo del facilitador</li>
              <li>• Actividad grupal</li>
            </ul>
          </CardContent>
        </Card>

        {/* Home Mode */}
        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg hover-elevate active-elevate-2 ${
            selectedMode === 'home' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => handleModeSelection('home')}
          data-testid="button-home-mode"
        >
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{background: 'linear-gradient(135deg, hsl(var(--opcion-magenta)), hsl(var(--opcion-yellow)))'}}>
                <Home className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-foreground">En Casa</CardTitle>
                <p className="text-sm text-muted-foreground">Modo autónomo</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Exploración independiente</li>
              <li>• Tutorial con audio</li>
              <li>• A tu propio ritmo</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="mt-8 space-y-4">
        <p className="text-base text-muted-foreground px-4 mb-4 text-center">
          Una bitácora emocional donde puedes cuidar plantas y registrar tus sentimientos
        </p>

        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          data-testid="button-support"
          onClick={() => setLocation('/help')}
        >
          Soporte para facilitadores
        </Button>
      </div>
    </div>
  );
}
