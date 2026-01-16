import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// This page is no longer needed with the simplified architecture
// Redirect to the demo studio
export default function JoinPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/demo-studio');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
