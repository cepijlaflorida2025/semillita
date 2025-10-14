import { X, Sprout, Heart, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import opcionIsollogo from "@assets/isologo_opcion_1758035535543.png";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border/20 animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-accent text-white p-6 rounded-t-2xl relative overflow-hidden">
          <div className="absolute top-2 right-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full"
              data-testid="button-close-help"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Decorative floating leaves */}
          <div className="absolute -top-2 -left-2 w-8 h-8 opacity-30">
            <Sprout className="w-full h-full float-animation" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 opacity-20">
            <Heart className="w-full h-full pulse-gentle" />
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <img 
                src={opcionIsollogo} 
                alt="OPCIÓN"
                className="w-8 h-8 opacity-90"
              />
            </div>
            <div>
              <h2 className="text-xl font-bold">¡Hola! 🌱</h2>
              <p className="text-sm opacity-90">¿Necesitas ayuda con Semillita?</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Contact Information */}
          <div className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Para consultas y apoyo, puedes comunicarte con:
              </p>
              <p className="text-xs text-muted-foreground/80 mt-1">
                Atención en horario laboral: L-V de 9:00 a 17:30
              </p>
            </div>

            {/* Contact Person */}
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-4 rounded-xl border border-primary/20">
              <div className="text-center mb-3">
                <p className="font-bold text-lg text-foreground">Paulina Gallardo Martínez</p>
                <p className="text-sm text-muted-foreground">Directora</p>
                <p className="text-sm font-medium text-primary">PRM CEPIJ La Florida</p>
              </div>

              <div className="space-y-3 mt-4">
                {/* Phone Numbers */}
                <div className="flex items-start space-x-3 p-2 bg-white/50 rounded-lg">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Teléfonos</p>
                    <p className="text-sm font-medium text-foreground">24939718 - 24939731</p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start space-x-3 p-2 bg-white/50 rounded-lg">
                  <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-accent" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Correo electrónico</p>
                    <a
                      href="mailto:pgallardo40@opcion.cl"
                      className="text-sm font-medium text-foreground hover:text-primary underline"
                    >
                      pgallardo40@opcion.cl
                    </a>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start space-x-3 p-2 bg-white/50 rounded-lg">
                  <div className="w-8 h-8 bg-secondary/60 rounded-full flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-secondary-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Dirección</p>
                    <p className="text-sm font-medium text-foreground">Av. Caupolicán #11517, La Florida</p>
                  </div>
                </div>

                {/* Website */}
                <div className="text-center mt-3 pt-3 border-t border-border/30">
                  <a
                    href="https://www.opcion.cl"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    www.opcion.cl
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* OPCIÓN Credits */}
          <div className="text-center pt-2 border-t border-border/30">
            <p className="text-xs text-muted-foreground">
              Una iniciativa de <span className="font-medium text-primary">OPCIÓN</span> para el bienestar emocional infantil
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}