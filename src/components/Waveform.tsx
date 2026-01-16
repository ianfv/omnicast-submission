import React from 'react';

export function Waveform() {
  const bars = [
    { height: 8, delay: 0 },
    { height: 14, delay: 0.2 },
    { height: 6, delay: 0.4 },
    { height: 20, delay: 0.1 },
    { height: 10, delay: 0.5 },
    { height: 24, delay: 0.3 },
    { height: 12, delay: 0.15 },
    { height: 28, delay: 0.25 },
    { height: 14, delay: 0.45 },
    { height: 22, delay: 0.35 },
    { height: 8, delay: 0.55 },
    { height: 18, delay: 0.1 },
    { height: 10, delay: 0.4 },
    { height: 16, delay: 0.2 },
    { height: 6, delay: 0.6 },
  ];

  return (
    <div className="flex items-center justify-center gap-[3px] h-8 opacity-60">
      {bars.map((bar, i) => (
        <div
          key={i}
          className="w-[2px] bg-muted-foreground rounded-full waveform-bar"
          style={{
            height: bar.height,
            animationDelay: `${bar.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
