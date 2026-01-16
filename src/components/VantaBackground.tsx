import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    VANTA: any;
    p5: any;
  }
}

export const VantaBackground = () => {
  const vantaRef = useRef<HTMLDivElement>(null);
  const vantaEffect = useRef<any>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const dataArray = useRef<Uint8Array | null>(null);
  const [micEnabled, setMicEnabled] = useState(false);

  useEffect(() => {
    // Load p5.js first (Vanta depends on it)
    const p5Script = document.createElement('script');
    p5Script.src = 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.1.9/p5.min.js';
    p5Script.async = true;
    document.body.appendChild(p5Script);

    // Load Vanta TRUNK only after p5.js is ready
    p5Script.onload = () => {
      const vantaScript = document.createElement('script');
      vantaScript.src = 'https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.trunk.min.js';
      vantaScript.async = true;
      document.body.appendChild(vantaScript);

      vantaScript.onload = () => {
        if (vantaRef.current && window.VANTA) {
          vantaEffect.current = window.VANTA.TRUNK({
            el: vantaRef.current,
            mouseControls: false, // Disable mouse controls
            touchControls: false, // Disable touch controls
            gyroControls: false,
            minHeight: 200.00,
            minWidth: 500.00,
            scale: 10.00, // Even more zoomed in - deep black hole in center
            scaleMobile: 10.00,
            color: 0xeb761f, // Orange color (#eb761f)
            backgroundColor: 0x0,
            chaos: 9.50,
            speed: 0.5 // Slow down the spinning/animation (default is 1.0)
          });

          // Auto-request microphone access
          enableMicrophone();

          // Start animation loop for audio reactivity
          animateWithAudio();
        }
      };

      // Store reference for cleanup
      (window as any).__vantaScript = vantaScript;
    };

    return () => {
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
      }
      if (p5Script.parentNode) {
        document.body.removeChild(p5Script);
      }
      const vantaScript = (window as any).__vantaScript;
      if (vantaScript?.parentNode) {
        document.body.removeChild(vantaScript);
      }
      if (audioContext.current) {
        audioContext.current.close();
      }
    };
  }, []);

  const enableMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyser.current = audioContext.current.createAnalyser();
      analyser.current.fftSize = 512; // Increased for smoother analysis
      analyser.current.smoothingTimeConstant = 0.85; // Smooth out audio data

      const source = audioContext.current.createMediaStreamSource(stream);
      source.connect(analyser.current);

      const bufferLength = analyser.current.frequencyBinCount;
      dataArray.current = new Uint8Array(bufferLength);

      setMicEnabled(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
      // Silently continue with simulated audio instead of alerting
      setMicEnabled(false);
    }
  };

  const animateWithAudio = () => {
    // Smoothing variables for interpolation - start at larger values
    let smoothChaos = 19.50;
    let smoothSpacing = 3.0;
    let smoothScale = 10.00; // Match even more zoomed in scale

    const animate = () => {
      if (vantaEffect.current) {
        let targetChaos = 19.50;
        let targetSpacing = 3.0;
        let targetScale = 10.00; // Match even more zoomed in scale

        // Only use real audio data (no simulation)
        if (analyser.current && dataArray.current) {
          // @ts-ignore - TypeScript strictness with ArrayBufferLike
          analyser.current.getByteFrequencyData(dataArray.current);

          // Calculate average volume
          const average = Array.from(dataArray.current).reduce((a, b) => a + b) / dataArray.current.length;
          const normalizedVolume = average / 255;

          // Bass frequencies (lower frequencies)
          const bass = Array.from(dataArray.current.slice(0, 15)).reduce((a, b) => a + b) / 15 / 255;

          // Mid frequencies
          const mid = Array.from(dataArray.current.slice(15, 50)).reduce((a, b) => a + b) / 35 / 255;

          // High frequencies
          const treble = Array.from(dataArray.current.slice(50, 100)).reduce((a, b) => a + b) / 50 / 255;

          // Map audio to Vanta parameters - amplified for more dramatic effect
          targetChaos = 10.0 + normalizedVolume * 20.0; // 10-30 range (much more reactive)
          targetSpacing = 1.0 + bass * 8.0; // Bass affects spacing dramatically
          targetScale = 9.0 + mid * 3.0; // Super zoomed in, vary with mid (9.0-12.0 range)
        } else {
          // Keep static when no audio
          targetChaos = 19.50;
          targetSpacing = 3.0;
          targetScale = 10.00; // Match even more zoomed in scale
        }

        // Smooth interpolation (lerp) - faster response for audio
        const lerpFactor = 0.15; // Higher = more responsive to audio
        smoothChaos += (targetChaos - smoothChaos) * lerpFactor;
        smoothSpacing += (targetSpacing - smoothSpacing) * lerpFactor;
        smoothScale += (targetScale - smoothScale) * lerpFactor;

        // Always keep the orange color (#eb761f)
        vantaEffect.current.setOptions({
          chaos: smoothChaos,
          spacing: smoothSpacing,
          scale: smoothScale,
          color: 0xeb761f, // Fixed orange color
        });
      }

      requestAnimationFrame(animate);
    };

    animate();
  };

  // Helper function to convert HSL to hex
  const hslToHex = (h: number, s: number, l: number): number => {
    const hslToRgb = (h: number, s: number, l: number) => {
      let r, g, b;

      if (s === 0) {
        r = g = b = l;
      } else {
        const hue2rgb = (p: number, q: number, t: number) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
      }

      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    };

    const [r, g, b] = hslToRgb(h, s, l);
    return (r << 16) | (g << 8) | b;
  };

  return <div ref={vantaRef} className="fixed inset-0 z-0" style={{ transform: 'scale(3)', transformOrigin: 'center' }} />;
};
