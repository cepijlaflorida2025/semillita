import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, HelpCircle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import BottomNavigation from "@/components/bottom-navigation";
import HelpModal from "@/components/help-modal";

const faqItems = [
  {
    question: '¿Qué pasa si mi planta se marchita?',
    answer: 'Es normal que las plantas a veces se pongan tristes. Puedes cambiar el estado en tu perfil de planta y seguir registrando tus emociones. Lo importante es que sigas cuidándola y aprendiendo.',
  },
  {
    question: '¿Cómo gano más puntos?',
    answer: 'Ganas puntos cada vez que creas una entrada (+10 pts), actualizas fotos de tu planta (+5 pts), y cuando completas hitos especiales (+50 pts). ¡La constancia es la clave!',
  },
  {
    question: '¿Puedo usar la app sin una planta real?',
    answer: 'Sí, puedes usar Semillita para registrar tus emociones incluso si no tienes una planta física. Puedes imaginar una planta virtual o dibujar tu planta ideal.',
  },
  {
    question: '¿Mis datos están seguros?',
    answer: 'Tu privacidad es muy importante. Solo tú y los adultos que te cuidan pueden ver tus entradas. Nunca compartimos tu información personal con otros.',
  },
  {
    question: '¿Qué es el guardador de semillas?',
    answer: 'Es un lugar especial donde puedes guardar información sobre diferentes tipos de semillas y compartirlas con otros niños usando códigos especiales.',
  },
];

export default function Help() {
  const [, setLocation] = useLocation();
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-primary to-accent text-primary-foreground p-4 rounded-b-xl shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={() => setLocation('/dashboard')}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Centro de Ayuda</h1>
              <p className="text-sm opacity-90">Aprende y resuelve dudas</p>
            </div>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <HelpCircle className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Tips for Home Use */}
        <Card data-testid="card-home-tips">
          <CardHeader>
            <CardTitle>Tips Replicables en Casa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Rutina diaria:</strong> Establece un momento fijo cada día para revisar tu planta y escribir en tu bitácora.
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Observación:</strong> Mira bien tu planta cada día. ¿Hay cambios? ¿Nuevas hojas? ¿Necesita agua?
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Comparte:</strong> Habla con tu familia sobre lo que sientes y cómo está creciendo tu planta.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">Preguntas Frecuentes</h2>
          
          <Card data-testid="card-faq">
            <CardContent className="p-0">
              <Accordion type="single" collapsible className="w-full">
                {faqItems.map((item, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="px-6 py-4 text-left">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4">
                      <p className="text-muted-foreground">{item.answer}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>

        {/* Contact Support */}
        <Card className="bg-accent/10 border-accent/20">
          <CardContent className="p-6 text-center">
            <MessageCircle className="w-12 h-12 text-accent-foreground mx-auto mb-4" />
            <h3 className="font-bold text-accent-foreground mb-2">¿Necesitas más ayuda?</h3>
            <p className="text-muted-foreground mb-4">
              Si tienes alguna pregunta que no está aquí, puedes contactarnos
            </p>
            <Button
              variant="outline"
              data-testid="button-contact-support"
              onClick={() => setIsHelpModalOpen(true)}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Contactar Soporte
            </Button>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />

      {/* Help Modal */}
      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
    </div>
  );
}
