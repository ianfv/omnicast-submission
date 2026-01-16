import { useRef } from 'react';
import Lottie from 'lottie-react';
import girl1 from '@/components/avatarslottie/girl1.json';
import male1 from '@/components/avatarslottie/male1.json';
import male2 from '@/components/avatarslottie/male2.json';

interface LottieAvatarProps {
  hostIndex: number;
  size?: number;
  isAnimating?: boolean;
  backgroundColor?: string;
  className?: string;
}

export function LottieAvatar({ 
  hostIndex, 
  size = 64, 
  isAnimating = false,
  backgroundColor,
  className = ''
}: LottieAvatarProps) {
  const lottieRef = useRef<any>(null);

  // Get avatar based on host index (max 3 hosts)
  const getAvatarData = (index: number) => {
    const avatars = [male1, girl1, male2];
    return avatars[index % 3];
  };

  const avatarData = getAvatarData(hostIndex);

  return (
    <div 
      className={className}
      style={{ 
        width: size, 
        height: size
      }}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={avatarData}
        loop={true}
        autoplay={isAnimating}
        style={{ 
          width: '100%', 
          height: '100%'
        }}
      />
    </div>
  );
}
