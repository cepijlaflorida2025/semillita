import { useState } from "react";
import { HelpCircle, Sprout } from "lucide-react";
import opcionIsollogo from "@assets/isologo_opcion_1758035535543.png";
import HelpModal from "./help-modal";

export default function FloatingOpcionIcon() {
  const [showHelpModal, setShowHelpModal] = useState(false);

  const handleClick = () => {
    setShowHelpModal(true);
  };

  return (
    <>
      {/* Floating Help Button */}
      <div 
        className="fixed bottom-24 right-6 z-40 cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:-translate-y-1 group"
        onClick={handleClick}
        data-testid="floating-opcion-icon"
      >
        {/* Animated Background Ring */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full animate-pulse opacity-30 scale-110"></div>
        
        {/* Main Button */}
        <div className="relative bg-gradient-to-br from-card to-background backdrop-blur-sm rounded-full p-4 shadow-lg border border-border/30 transition-all duration-300 hover:shadow-xl">
          {/* Decorative micro-elements */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full opacity-80 group-hover:scale-125 transition-transform duration-300"></div>
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-primary rounded-full opacity-60 group-hover:scale-150 transition-transform duration-300"></div>
          
          <div className="relative">
            <img 
              src={opcionIsollogo} 
              alt="Ayuda - OPCIÓN por los derechos de niñas y niños"
              className="w-8 h-8 opacity-90 group-hover:opacity-100 transition-opacity duration-200 group-hover:rotate-3 transition-transform"
            />
            
            {/* Floating question mark indicator */}
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-white rounded-full flex items-center justify-center opacity-75 group-hover:opacity-100 transition-all duration-200">
              <HelpCircle className="w-3 h-3" />
            </div>
          </div>
        </div>
        
        {/* Floating nature elements */}
        <div className="absolute -top-2 -left-2 opacity-40 group-hover:opacity-70 transition-opacity duration-300">
          <Sprout className="w-4 h-4 text-primary animate-bounce" style={{animationDelay: '0.5s'}} />
        </div>
      </div>

      {/* Help Modal */}
      <HelpModal 
        isOpen={showHelpModal} 
        onClose={() => setShowHelpModal(false)} 
      />
    </>
  );
}