import { useNavigate } from 'react-router-dom';
import omnicastLogo from '@/assets/omnicast-icon.png';
import { Button } from '@/components/ui/button';

export function Header() {
  const navigate = useNavigate();
  
  return (
    <header className="flex items-center justify-between py-6 px-6 border-b border-border">
      <button 
        onClick={() => navigate('/dashboard')} 
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <img src={omnicastLogo} alt="Omnicast" className="w-8 h-8 object-contain" />
        <span className="font-semibold tracking-tight text-lg">Omnicast</span>
      </button>
      <Button
        onClick={() => navigate('/auth')}
        variant="outline"
        size="sm"
        className="rounded-full"
      >
        Sign In
      </Button>
    </header>
  );
}