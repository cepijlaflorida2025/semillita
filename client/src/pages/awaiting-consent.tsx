import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Mail, Clock, Shield, CheckCircle, XCircle } from "lucide-react";
import AppHeader from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useStorage } from "@/hooks/use-storage";

export default function AwaitingConsent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { currentUser, setCurrentUser } = useStorage();
  const [verificationCode, setVerificationCode] = useState("");

  const verifyConsentMutation = useMutation({
    mutationFn: async (code: string) => {
      if (!currentUser?.id) {
        throw new Error('No user found for verification');
      }
      const response = await apiRequest('POST', '/api/verify-consent', { 
        verificationCode: code,
        userId: currentUser.id 
      });
      return response.json();
    },
    onSuccess: (user) => {
      if (user.consentVerified) {
        setCurrentUser(user);
        toast({
          title: "¡Consentimiento verificado!",
          description: "El adulto responsable ha autorizado tu acceso. ¡Bienvenido a Semillita!",
        });
        setLocation('/onboarding');
      } else {
        toast({
          title: "Código incorrecto",
          description: "El código ingresado no es válido. Inténtalo de nuevo.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error de verificación",
        description: "No se pudo verificar el código. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  const resendEmailMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/resend-consent-email', {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Correo reenviado",
        description: "Se ha enviado nuevamente el correo de confirmación al adulto responsable.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo reenviar el correo. Inténtalo más tarde.",
        variant: "destructive",
      });
    },
  });

  const handleVerify = () => {
    if (verificationCode.trim()) {
      verifyConsentMutation.mutate(verificationCode.trim());
    }
  };

  const handleResendEmail = () => {
    resendEmailMutation.mutate();
  };

  // COPPA compliance: Don't allow navigation away from consent flow
  const handleBackClick = () => {
    // Could allow going back to register to fix information
    setLocation('/register');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* AppHeader with limited back navigation */}
      <AppHeader
        title="Esperando confirmación"
        subtitle="Un adulto responsable debe autorizar tu acceso"
        showBackButton={true}
        onBackClick={handleBackClick}
        showHelpButton={true}
        variant="gradient"
      />

      <div className="p-4">
        {/* Status Icon */}
        <div className="text-center py-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-orange-500 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-white" />
          </div>
        </div>

        <div className="max-w-md mx-auto space-y-6">
        {/* COPPA Compliance Info */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Para tu seguridad:</strong> Necesitamos que un adulto (padre, madre o tutor) 
            confirme que está de acuerdo con que uses Semillita antes de poder empezar.
          </AlertDescription>
        </Alert>

        {/* Email Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Mail className="w-5 h-5 mr-2" />
              Correo enviado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Se envió un correo de confirmación</p>
                <p className="text-xs text-muted-foreground">
                  El adulto responsable recibirá un correo con instrucciones para autorizar tu acceso.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Clock className="w-5 h-5 text-orange-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Esperando confirmación</p>
                <p className="text-xs text-muted-foreground">
                  Una vez que el adulto confirme, podrás usar Semillita inmediatamente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verification Code Entry */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">¿Ya tienes el código?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Si el adulto responsable ya confirmó tu acceso, ingresa el código que recibiste:
            </p>
            
            <div className="space-y-3">
              <Input
                type="text"
                placeholder="Código de verificación"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                data-testid="input-verification-code"
                className="text-center text-lg tracking-widest"
                maxLength={8}
              />
              
              <Button
                onClick={handleVerify}
                disabled={!verificationCode.trim() || verifyConsentMutation.isPending}
                className="w-full"
                data-testid="button-verify-code"
              >
                {verifyConsentMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Verificando...
                  </div>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Verificar código
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help Options */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">¿Necesitas ayuda?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={handleResendEmail}
                disabled={resendEmailMutation.isPending}
                className="w-full"
                data-testid="button-resend-email"
              >
                {resendEmailMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                    Reenviando...
                  </div>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Reenviar correo
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                onClick={() => setLocation('/welcome')}
                className="w-full"
                data-testid="button-back-welcome"
              >
                Volver al inicio
              </Button>
            </div>

            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p>Si tienes problemas, pide ayuda al adulto responsable.</p>
              <p>El correo puede tardar unos minutos en llegar.</p>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}