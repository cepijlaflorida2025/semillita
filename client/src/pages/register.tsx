import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sprout, User, CheckCircle } from "lucide-react";
import AppHeader from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useStorage } from "@/hooks/use-storage";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import opcionIsollogo from "@assets/isologo_opcion_1758035535543.png";

// UI-only fields for form management
const uiOnlyFields = z.object({
  password: z.string().min(4, "La contraseña debe tener al menos 4 caracteres"),
  confirmPassword: z.string().min(4, "Confirma tu contraseña"),
});

type UIRegisterForm = InsertUser & z.infer<typeof uiOnlyFields>;

const AVATAR_OPTIONS = [
  { id: 'plant1', emoji: '🌱', name: 'Brote' },
  { id: 'plant2', emoji: '🌿', name: 'Hoja' },
  { id: 'flower1', emoji: '🌸', name: 'Flor Rosa' },
  { id: 'flower2', emoji: '🌻', name: 'Girasol' },
  { id: 'tree', emoji: '🌳', name: 'Árbol' },
  { id: 'cactus', emoji: '🌵', name: 'Cactus' },
];

const COLOR_THEMES = [
  { id: 'green', name: 'Verde', color: 'bg-green-500' },
  { id: 'blue', name: 'Azul', color: 'bg-blue-500' },
  { id: 'purple', name: 'Morado', color: 'bg-purple-500' },
  { id: 'pink', name: 'Rosa', color: 'bg-pink-500' },
  { id: 'orange', name: 'Naranja', color: 'bg-orange-500' },
  { id: 'yellow', name: 'Amarillo', color: 'bg-yellow-500' },
];

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { setCurrentUser } = useStorage();
  const [step, setStep] = useState(1);

  const form = useForm<UIRegisterForm>({
    resolver: zodResolver(z.object({
      alias: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
      avatar: z.string().optional(),
      colorTheme: z.string().default("green"),
      age: z.number().min(6, "Debes tener al menos 6 años"),
      role: z.literal("child"),
      password: z.string().min(4, "La contraseña debe tener al menos 4 caracteres"),
      confirmPassword: z.string().min(4, "Confirma tu contraseña"),
      // Simplified fields
      parentEmail: z.string().optional(),
      parentalConsent: z.boolean().optional(),
      consentAcknowledgment: z.boolean().optional(),
      points: z.number().optional(),
      daysSincePlanting: z.number().optional(),
      isWorkshopMode: z.boolean().optional(),
      consentVerified: z.boolean().optional(),
      parentalConsentDate: z.string().optional(),
    }).superRefine((data, ctx) => {
      // Validar que las contraseñas coincidan
      if (data.password !== data.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Las contraseñas no coinciden",
          path: ["confirmPassword"],
        });
      }
      // Age validation for children only
      if (data.age < 6 || data.age > 17) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Debes tener entre 6 y 17 años para registrarte",
          path: ["age"],
        });
      }
      // Todos deben aceptar términos
      if (!data.consentAcknowledgment) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Debes confirmar que has leído y aceptas los términos",
          path: ["consentAcknowledgment"],
        });
      }
    })),
    defaultValues: {
      alias: "",
      avatar: "plant1",
      colorTheme: "green",
      password: "",
      confirmPassword: "",
      age: 10,
      role: "child",
      parentEmail: "",
      parentalConsent: false,
      consentAcknowledgment: false,
      points: 0,
      daysSincePlanting: 0,
      isWorkshopMode: false,
      consentVerified: true,
    },
  });


  const registerMutation = useMutation({
    mutationFn: async (data: UIRegisterForm) => {
      // Prepare data for server validation with discriminated union schema
      let serverData: InsertUser;

      // Get mode from localStorage
      const selectedMode = localStorage.getItem('semillita_mode') || 'home';

      // Create role-specific data structure to match discriminated union
      if (data.role === 'child') {
        serverData = {
          alias: data.alias,
          avatar: data.avatar,
          colorTheme: data.colorTheme,
          age: data.age,
          context: selectedMode as 'workshop' | 'home',
          role: 'child' as const,
          points: 0,
          daysSincePlanting: 0,
          isWorkshopMode: selectedMode === 'workshop',
          parentEmail: data.parentEmail,
          parentalConsent: data.parentalConsent,
          consentAcknowledgment: data.consentAcknowledgment!,
          parentalConsentDate: data.consentAcknowledgment ? new Date().toISOString() : undefined,
          consentVerified: true, // Auto-verificado en modo prototipo
        };
      } else { // professional
        serverData = {
          alias: data.alias,
          avatar: data.avatar,
          colorTheme: data.colorTheme,
          age: data.age,
          context: selectedMode as 'workshop' | 'home',
          role: 'professional' as const,
          points: 0,
          daysSincePlanting: 0,
          isWorkshopMode: selectedMode === 'workshop',
          parentEmail: data.parentEmail,
          parentalConsent: data.parentalConsent,
          consentAcknowledgment: data.consentAcknowledgment!,
          parentalConsentDate: data.consentAcknowledgment ? new Date().toISOString() : undefined,
          consentVerified: true, // Adults auto-verified
        };
      }

      // Validate with shared discriminated union schema before sending
      const validatedData = insertUserSchema.parse(serverData);

      const response = await apiRequest('POST', '/api/users', validatedData);
      const createdUser = await response.json();

      // Guardar contraseña en localStorage (temporal, en producción usar backend seguro)
      localStorage.setItem(`semillita_password_${createdUser.id}`, data.password);

      return createdUser;
    },
    onSuccess: (user) => {
      // Acceso liberado para todos los usuarios
      setCurrentUser(user);
      toast({
        title: "¡Perfil creado exitosamente!",
        description: "¡Bienvenido a Semillita! Vamos a empezar tu aventura.",
      });
      setLocation('/onboarding');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear tu perfil. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UIRegisterForm) => {
    registerMutation.mutate(data);
  };

  // Todos ahora tienen un solo paso con confirmación de términos
  const totalSteps = 2; // Paso 1: Info personal, Paso 2: Confirmación de términos

  const nextStep = () => {
    if (step === 1) {
      form.trigger(['alias', 'avatar', 'colorTheme', 'age', 'role', 'password', 'confirmPassword']).then(isValid => {
        if (isValid) {
          setStep(2);
        }
      });
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const handleBackClick = () => {
    if (step > 1) {
      prevStep();
    } else {
      setLocation('/mode-selection');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* AppHeader with back navigation */}
      <AppHeader
        title="Crear tu perfil"
        subtitle={`Paso ${step} de ${totalSteps} - Una iniciativa de OPCIÓN y Semillita`}
        showBackButton={true}
        onBackClick={handleBackClick}
        showHelpButton={true}
        variant="gradient"
      />

      <div className="p-4">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="h-2 rounded-full transition-all duration-300" 
              style={{ 
                width: `${(step / totalSteps) * 100}%`,
                background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--opcion-orange)))'
              }}
            />
          </div>
          <div className="text-center mt-2">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <Sprout className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Personal Info */}
          {step === 1 && (
            <Card className="fade-in" data-testid="card-step-1">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Información Personal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Alias Field */}
                <FormField
                  control={form.control}
                  name="alias"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>¿Cómo te gusta que te llamen?</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Tu nombre o apodo" 
                          {...field}
                          data-testid="input-alias"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Avatar Selection */}
                <FormField
                  control={form.control}
                  name="avatar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Elige tu avatar</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-3 gap-3">
                          {AVATAR_OPTIONS.map((avatar) => (
                            <button
                              key={avatar.id}
                              type="button"
                              className={`p-4 rounded-lg border-2 transition-all hover-elevate ${
                                field.value === avatar.id
                                  ? 'border-primary bg-primary/10'
                                  : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => field.onChange(avatar.id)}
                              data-testid={`button-avatar-${avatar.id}`}
                            >
                              <div className="text-3xl mb-1">{avatar.emoji}</div>
                              <div className="text-xs font-medium">{avatar.name}</div>
                            </button>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Color Theme */}
                <FormField
                  control={form.control}
                  name="colorTheme"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color favorito</FormLabel>
                      <FormControl>
                        <div className="flex flex-wrap gap-2">
                          {COLOR_THEMES.map((theme) => (
                            <button
                              key={theme.id}
                              type="button"
                              className={`w-12 h-12 rounded-full border-4 transition-all hover:scale-110 ${
                                theme.color
                              } ${
                                field.value === theme.id
                                  ? 'border-foreground shadow-lg'
                                  : 'border-border'
                              }`}
                              onClick={() => field.onChange(theme.id)}
                              data-testid={`button-color-${theme.id}`}
                              title={theme.name}
                            />
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Age Field */}
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>¿Cuántos años tienes?</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="6"
                          placeholder="10"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                          data-testid="input-age"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Hidden Role - Always child */}
                <input type="hidden" {...form.register("role")} value="child" />

                {/* Password Fields */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Crea una contraseña"
                          {...field}
                          data-testid="input-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Contraseña</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Confirma tu contraseña"
                          {...field}
                          data-testid="input-confirm-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 2: Confirmación de Términos - Para todos */}
          {step === 2 && (
            <Card className="fade-in" data-testid="card-step-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Términos y Condiciones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-primary/10 rounded-lg p-4">
                  <h3 className="font-semibold text-foreground mb-2">Modo Prototipo - Acceso Libre</h3>
                  <p className="text-sm text-muted-foreground">
                    Semillita es una aplicación para registrar emociones y el crecimiento de plantas de forma segura.
                    Al continuar, confirmas que has leído y aceptas nuestros términos de uso.
                    <span className="block mt-2 font-medium">
                      Como eres menor de edad, un adulto responsable debe estar al tanto de tu uso de la aplicación.
                    </span>
                  </p>
                </div>

                <div className="border rounded-lg p-4 max-h-48 overflow-y-auto text-sm space-y-2">
                  <h4 className="font-semibold">Resumen de Términos:</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>La aplicación registra fotos de plantas y emociones de forma privada</li>
                    <li>Los datos se almacenan de forma segura y solo tú puedes verlos</li>
                    <li>No compartimos tu información con terceros</li>
                    <li>Usa la aplicación de manera responsable y con supervisión</li>
                    <li>Los menores de edad deben contar con supervisión de un adulto</li>
                    <li>Contacta a OPCIÓN para cualquier duda o problema</li>
                  </ul>
                </div>

                <FormField
                  control={form.control}
                  name="consentAcknowledgment"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-consent-acknowledgment"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          He leído y acepto los términos y condiciones
                        </FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Confirmo que comprendo cómo funciona la aplicación y acepto sus términos de uso.
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={step === 1 ? () => setLocation('/mode-selection') : prevStep}
              data-testid="button-back"
            >
              Atrás
            </Button>

            {step < totalSteps ? (
              <Button
                type="button"
                onClick={nextStep}
                data-testid="button-next"
              >
                Siguiente
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={registerMutation.isPending}
                data-testid="button-finish"
              >
                {registerMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Creando perfil...
                  </div>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Finalizar
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </Form>
      </div>
    </div>
  );
}
