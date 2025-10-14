import { useLocation } from "wouter";
import { Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useStorage } from "@/hooks/use-storage";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { currentUser } = useStorage();
  const isWorkshopMode = localStorage.getItem('semillita_mode') === 'workshop';

  const finishOnboarding = () => {
    localStorage.setItem('semillita_onboarding_completed', 'true');
    setLocation('/dashboard');
  };

  if (!currentUser) {
    setLocation('/welcome');
    return null;
  }

  // Welcome screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6 flex items-center justify-center">
      <Card className="max-w-lg w-full shadow-2xl border-primary/20">
        <CardContent className="p-8 space-y-6">
          {/* Header with icon */}
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-lg">
              <Sprout className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-3">
              ¡Bienvenido a Semillita! 🌱
            </h1>
            <p className="text-lg text-primary font-semibold">
              {currentUser.alias}
            </p>
          </div>

          {/* Welcome message */}
          <div className="space-y-4 text-center">
            <p className="text-base text-foreground leading-relaxed">
              <strong>Semillita</strong> es tu espacio seguro para <strong>conocer y cuidar tus plantitas</strong>,
              igual que cuidas de ti todos los días.
            </p>

            <div className="bg-primary/5 p-4 rounded-lg">
              <p className="text-sm text-foreground/90">
                Aquí podrás <strong>registrar cómo te sientes</strong> cada día,
                ver cómo van creciendo tus plantitas y <strong>descubrir herramientas</strong>
                que te ayudarán a sentirte mejor.
              </p>
            </div>

            <p className="text-base text-foreground">
              ¡Cada día que uses Semillita, tu plantita crecerá más fuerte! 💪✨
            </p>

            {isWorkshopMode && (
              <div className="bg-accent/10 p-3 rounded-lg border border-accent/30">
                <p className="text-sm text-accent-foreground">
                  <strong>Tu facilitador te acompañará</strong> en cada paso de esta aventura
                </p>
              </div>
            )}
          </div>

          {/* Action button - goes directly to dashboard */}
          <div className="pt-4">
            <Button
              className="w-full py-6 text-lg font-semibold"
              onClick={finishOnboarding}
              data-testid="button-start-adventure"
            >
              ¡Empecemos la aventura! 🚀
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
