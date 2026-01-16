import React from 'react';
import './OmnicastSpinner.css';

interface OmnicastSpinnerProps {
  size?: number;
  speed?: number;
  background?: 'black' | 'transparent';
  className?: string;
}

export const OmnicastSpinner: React.FC<OmnicastSpinnerProps> = ({
  size = 48,
  speed = 1.2,
  background = 'transparent',
  className = '',
}) => {
  // Audio wave configuration
  const barCount = 16; // More bars for smoother wave
  const barWidth = size * 0.045;
  const gap = size * 0.015;
  const totalWidth = barCount * barWidth + (barCount - 1) * gap;
  const startX = (size - totalWidth) / 2;
  const centerY = size / 2;

  // Generate bars with varying heights and colors
  const bars = Array.from({ length: barCount }, (_, i) => {
    const isOrangeBar = i < barCount / 2;
    const color = isOrangeBar ? '#EB761F' : '#FFFFFF';
    const x = startX + i * (barWidth + gap);
    
    // Create a smooth sine wave pattern for initial heights
    const wavePosition = (i / (barCount - 1)) * Math.PI * 2;
    const baseHeight = size * 0.15;
    const maxHeight = size * 0.65;
    const initialHeight = baseHeight + (Math.sin(wavePosition) * 0.5 + 0.5) * (maxHeight - baseHeight);
    
    // Smooth delay distribution for continuous wave motion
    const normalizedPosition = i / (barCount - 1);
    const delay = normalizedPosition * speed * 0.8;
    
    return {
      x,
      color,
      initialHeight,
      delay,
      isOrange: isOrangeBar,
      index: i
    };
  });

  return (
    <div
      className={`omnicast-spinner-container ${className}`}
      style={{
        width: size,
        height: size,
        background: background === 'black' ? '#000000' : 'transparent',
      }}
      role="status"
      aria-label="Loading"
    >
      <svg
        className="omnicast-audio-wave"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Glow effect layer */}
        <defs>
          <filter id="glow-orange">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="glow-white">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {bars.map((bar, i) => (
          <rect
            key={i}
            className={`audio-bar ${bar.isOrange ? 'audio-bar-orange' : 'audio-bar-white'}`}
            x={bar.x}
            y={centerY - bar.initialHeight / 2}
            width={barWidth}
            height={bar.initialHeight}
            rx={barWidth / 2}
            fill={bar.color}
            filter={bar.isOrange ? 'url(#glow-orange)' : 'url(#glow-white)'}
            style={{
              animationDelay: `${bar.delay}s`,
              animationDuration: `${speed}s`,
            }}
          />
        ))}
      </svg>
      
      {/* Radial glow background */}
      <div
        className="omnicast-spinner-glow"
        style={{
          width: size,
          height: size,
        }}
      />
    </div>
  );
};

export default OmnicastSpinner;
