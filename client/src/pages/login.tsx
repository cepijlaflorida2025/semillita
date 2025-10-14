import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LogIn, User, Shield, Users } from "lucide-react";
import AppHeader from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useStorage } from "@/hooks/use-storage";

const loginSchema = z.object({
  alias: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  password: z.string().min(4, "La contraseña debe tener al menos 4 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;

type LoginType = 'child' | 'facilitator' | null;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { setCurrentUser } = useStorage();
  const [loginType, setLoginType] = useState<LoginType>(null);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      alias: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      // Si es facilitador, usar credenciales fijas
      if (loginType === 'facilitator') {
        if (data.alias !== 'facilitador' || data.password !== 'cepij2025') {
          throw new Error('Credenciales de facilitador incorrectas');
        }

        // Buscar usuario facilitador existente
        const searchResponse = await apiRequest('GET', `/api/users?alias=facilitador`);
        const existingUsers = await searchResponse.json();

        if (existingUsers && existingUsers.length > 0) {
          // Guardar contraseña en localStorage
          localStorage.setItem(`semillita_password_${existingUsers[0].id}`, 'cepij2025');
          return { user: existingUsers[0], isFacilitator: true };
        }

        // Si no existe, crear usuario facilitador
        const selectedMode = localStorage.getItem('semillita_mode') || 'workshop';
        const facilitatorData = {
          alias: 'facilitador',
          avatar: 'plant1',
          colorTheme: 'orange',
          age: 25,
          context: selectedMode as 'workshop' | 'home',
          role: 'facilitator' as const,
          points: 0,
          daysSincePlanting: 0,
          isWorkshopMode: selectedMode === 'workshop',
          parentEmail: null,
          parentalConsent: null,
          consentAcknowledgment: true,
          parentalConsentDate: new Date().toISOString(),
          consentVerified: true,
        };

        const createResponse = await apiRequest('POST', '/api/users', facilitatorData);
        const createdUser = await createResponse.json();

        // Guardar contraseña en localStorage
        localStorage.setItem(`semillita_password_${createdUser.id}`, 'cepij2025');

        return { user: createdUser, isFacilitator: true };
      }

      // Login normal para niños
      const response = await apiRequest('GET', `/api/users?alias=${encodeURIComponent(data.alias)}`);
      const users = await response.json();
      return { users, isFacilitator: false };
    },
    onSuccess: (result) => {
      if (result.isFacilitator) {
        // Login de facilitador exitoso
        setCurrentUser(result.user);
        toast({
          title: "¡Bienvenido Facilitador!",
          description: "Acceso concedido al panel de facilitador.",
        });
        // Redirigir directamente al dashboard del facilitador
        setLocation('/facilitator/dashboard');
        return;
      }

      // Login de niño
      const users = result.users;
      if (!users || users.length === 0) {
        toast({
          title: "Usuario no encontrado",
          description: "No se encontró un perfil con ese nombre. Por favor, crea un nuevo perfil.",
          variant: "destructive",
        });
        return;
      }

      const user = users[0];
      const enteredPassword = form.getValues('password');

      // Validación simple de contraseña
      const storedPassword = localStorage.getItem(`semillita_password_${user.id}`) || '1234';

      if (enteredPassword !== storedPassword) {
        toast({
          title: "Contraseña incorrecta",
          description: "La contraseña ingresada no es correcta. Intenta de nuevo.",
          variant: "destructive",
        });
        return;
      }

      // Login exitoso - redirigir según el rol
      setCurrentUser(user);
      toast({
        title: "¡Bienvenido de vuelta!",
        description: `Hola ${user.alias}, es bueno verte de nuevo.`,
      });

      // Redirigir según el rol del usuario
      if (user.role === 'facilitator') {
        setLocation('/facilitator/dashboard');
      } else {
        setLocation('/dashboard');
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo iniciar sesión. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  // Si no ha seleccionado tipo de login, mostrar opciones
  if (!loginType) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader
          title="Iniciar Sesión"
          subtitle="Selecciona cómo quieres ingresar"
          showBackButton={true}
          onBackClick={() => setLocation('/mode-selection')}
          showHelpButton={true}
          variant="gradient"
        />

        <div className="p-4">
          <div className="space-y-4 mt-8">
            <Card
              className="fade-in cursor-pointer hover-elevate transition-all hover:border-primary"
              onClick={() => setLoginType('child')}
            >
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">Iniciar como Niño/Niña</h3>
                    <p className="text-sm text-muted-foreground">
                      Ingresa con tu nombre de usuario
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="fade-in cursor-pointer hover-elevate transition-all hover:border-primary"
              onClick={() => setLoginType('facilitator')}
            >
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center">
                    <Shield className="w-6 h-6 text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">Iniciar como Facilitador</h3>
                    <p className="text-sm text-muted-foreground">
                      Acceso con credenciales de facilitador
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              ¿No tienes un perfil?
            </p>
            <Button
              variant="link"
              onClick={() => setLocation('/register')}
              data-testid="button-go-to-register"
            >
              Crear Perfil de Niño/Niña
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Formulario de login
  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title={loginType === 'facilitator' ? 'Acceso Facilitador' : 'Iniciar Sesión'}
        subtitle={loginType === 'facilitator' ? 'Ingresa tus credenciales de facilitador' : 'Ingresa tus credenciales para continuar'}
        showBackButton={true}
        onBackClick={() => setLoginType(null)}
        showHelpButton={true}
        variant="gradient"
      />

      <div className="p-4">
        <Card className="fade-in mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              {loginType === 'facilitator' ? (
                <>
                  <Shield className="w-5 h-5 mr-2" />
                  Acceso Facilitador
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Iniciar Sesión
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>  
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="alias"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usuario</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={loginType === 'facilitator' ? 'facilitador' : 'Tu nombre o apodo'}
                          {...field}
                          data-testid="input-login-alias"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Tu contraseña"
                          {...field}
                          data-testid="input-login-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                  data-testid="button-submit-login"
                >
                  {loginMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Iniciando sesión...
                    </div>
                  ) : (
                    <>
                      <User className="w-4 h-4 mr-2" />
                      Iniciar Sesión
                    </>
                  )}
                </Button>
              </form>
            </Form>

            {loginType === 'child' && (
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  ¿No tienes un perfil?
                </p>
                <Button
                  variant="link"
                  onClick={() => setLocation('/register')}
                  data-testid="button-go-to-register"
                >
                  Crear Perfil
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
