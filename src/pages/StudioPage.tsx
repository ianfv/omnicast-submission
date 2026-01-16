import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import omnicastLogo from '@/assets/omnicast-icon.png';
import { VantaBackground } from '@/components/VantaBackground';
import { motion } from 'framer-motion';
export default function StudioPage() {
  const navigate = useNavigate();
  return <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Vanta TRUNK Background */}
      <VantaBackground />
      
      {/* Vignette overlay */}
      <div className="fixed inset-0 vignette pointer-events-none z-[1]" />
      
      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col backdrop-blur-[2px]">
        {/* Minimal header - logo only */}
        <motion.header 
          className="p-6 md:p-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center gap-2">
            <img src={omnicastLogo} alt="Omnicast" className="w-10 h-10 object-contain" />
            <span className="tracking-tight text-2xl font-semibold">Omnicast</span>
          </div>
        </motion.header>
        
        {/* Hero - centered */}
        <main className="flex-1 flex items-center justify-center px-6">
          <motion.div 
            className="text-center max-w-2xl mx-auto -mt-20"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            {/* Headline */}
            <h1 className="font-canela">
              <motion.span 
                className="block text-5xl md:text-7xl lg:text-8xl font-light tracking-tight text-white drop-shadow-[0_0_30px_rgba(0,212,255,0.3)]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                Your AI
              </motion.span>
              <motion.span 
                className="block text-5xl md:text-7xl lg:text-8xl font-light tracking-tight text-white/90 italic mt-1 drop-shadow-[0_0_30px_rgba(176,0,255,0.3)]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              >
                Roundtable.
              </motion.span>
            </h1>
            
            {/* Subheadline */}
            <motion.p 
              className="text-gray-300 text-base md:text-lg max-w-md mx-auto mt-6 drop-shadow-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.7 }}
            >
              Interactive AI conversations on demand.
            </motion.p>
            
            {/* Action buttons */}
            <motion.div 
              className="flex items-center justify-center gap-4 mt-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.9 }}
            >
            <Button 
              onClick={() => navigate('/setup')} 
              size="lg" 
              className="h-12 px-8 text-sm font-medium rounded-full bg-white text-black hover:bg-gray-100 transition-all duration-300 active:scale-95 border-0"
            >
              Start now
            </Button>
            {/* Sign in button - hidden for now
            <Button 
              onClick={() => navigate('/auth')} 
              variant="ghost" 
              size="lg" 
              className="h-12 px-8 text-sm font-medium rounded-full glass-button border-white/20 hover:border-white/40 transition-all duration-300 active:scale-95"
            >
              Sign in
            </Button>
            */}
            </motion.div>
          </motion.div>
        </main>
        
        {/* Minimal footer */}
        <footer className="p-6 md:p-8">
          
        </footer>
      </div>
    </div>;
}