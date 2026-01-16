import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Perlin noise implementation (simplified)
class PerlinNoise {
  private permutation: number[];
  
  constructor() {
    this.permutation = [];
    for (let i = 0; i < 256; i++) {
      this.permutation[i] = Math.floor(Math.random() * 256);
    }
    this.permutation = this.permutation.concat(this.permutation);
  }
  
  fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  
  lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }
  
  grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
  
  noise(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    
    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);
    
    const A = this.permutation[X] + Y;
    const AA = this.permutation[A] + Z;
    const AB = this.permutation[A + 1] + Z;
    const B = this.permutation[X + 1] + Y;
    const BA = this.permutation[B] + Z;
    const BB = this.permutation[B + 1] + Z;
    
    return this.lerp(w,
      this.lerp(v,
        this.lerp(u, this.grad(this.permutation[AA], x, y, z),
          this.grad(this.permutation[BA], x - 1, y, z)),
        this.lerp(u, this.grad(this.permutation[AB], x, y - 1, z),
          this.grad(this.permutation[BB], x - 1, y - 1, z))),
      this.lerp(v,
        this.lerp(u, this.grad(this.permutation[AA + 1], x, y, z - 1),
          this.grad(this.permutation[BA + 1], x - 1, y, z - 1)),
        this.lerp(u, this.grad(this.permutation[AB + 1], x, y - 1, z - 1),
          this.grad(this.permutation[BB + 1], x - 1, y - 1, z - 1))));
  }
}

export const LogoWaveBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const dataArray = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 35;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Initialize Perlin noise
    const perlin = new PerlinNoise();
    
    // Vanta-style noise offsets (like ox, oy, oz in Vanta TRUNK)
    const noiseOffsets = {
      x: Math.random() * 10000,
      y: Math.random() * 10000,
      z: Math.random() * 10000,
    };

    // Create simple circular ring (no logo shape)
    const createCirclePath = () => {
      const points: THREE.Vector2[] = [];
      const segments = 360; // Full smooth circle
      
      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = Math.cos(angle);
        const y = Math.sin(angle);
        points.push(new THREE.Vector2(x, y));
      }
      
      return points;
    };

    // Create multiple layers - Vanta style (more rings)
    const rings = 40; // Like Vanta TRUNK
    const basePoints = createCirclePath();
    const allLayers: {
      points: THREE.Vector3[];
      originalPoints: THREE.Vector3[];
      line: THREE.Line;
      layerIndex: number;
    }[] = [];

    // Vanta TRUNK parameters - smaller to fit screen
    const dimInit = 30; // Smaller starting size
    const dimDelta = 3; // Smaller increment
    const chaosInit = 0.2;
    const chaosDelta = 0.12;
    const chaosMag = 20;

    for (let ring = 0; ring < rings; ring++) {
      const scale = dimInit + dimDelta * ring;
      const points: THREE.Vector3[] = [];
      const originalPoints: THREE.Vector3[] = [];
      
      basePoints.forEach(point => {
        const x = point.x * scale;
        const y = point.y * scale;
        const z = -ring * 0.3;
        
        const p = new THREE.Vector3(x, y, z);
        points.push(p.clone());
        originalPoints.push(p.clone());
      });

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      
      // Red/pink color gradient
      const hue = 0.98 + ring * 0.005; // Red/pink range (0.98 = red)
      const color = new THREE.Color().setHSL(hue, 1.0, 0.55);
      
      const material = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.6 - ring * 0.012,
        blending: THREE.AdditiveBlending,
      });

      const line = new THREE.Line(geometry, material);
      scene.add(line);

      allLayers.push({
        points,
        originalPoints,
        line,
        layerIndex: ring,
      });
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x00d4ff, 2, 100);
    pointLight1.position.set(15, 15, 20);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xb000ff, 2, 100);
    pointLight2.position.set(-15, -15, 20);
    scene.add(pointLight2);

    // No mouse interaction

    // Auto-request microphone
    const enableMicrophone = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyser.current = audioContext.current.createAnalyser();
        analyser.current.fftSize = 512;
        analyser.current.smoothingTimeConstant = 0.7;
        
        const source = audioContext.current.createMediaStreamSource(stream);
        source.connect(analyser.current);
        
        const bufferLength = analyser.current.frequencyBinCount;
        dataArray.current = new Uint8Array(bufferLength);
      } catch (err) {
        console.error('Microphone access denied:', err);
      }
    };

    enableMicrophone();

    // Animation loop - Vanta TRUNK style
    const clock = new THREE.Clock();

    const animate = () => {
      const time = clock.getElapsedTime();

      let chaos = 1.0; // Base chaos value

      // Get audio data
      if (analyser.current && dataArray.current) {
        // @ts-ignore - TypeScript strictness with ArrayBufferLike
        analyser.current.getByteFrequencyData(dataArray.current);
        const average = Array.from(dataArray.current).reduce((a, b) => a + b) / dataArray.current.length;
        chaos = 1.0 + (average / 255) * 4; // More dramatic audio response (1-5)
      } else {
        // Simulate audio with more variation
        chaos = 1.5 + Math.sin(time * 1.5) * 0.8;
      }

      // Update noise offsets (like Vanta TRUNK)
      noiseOffsets.y -= 0.02; // Slow drift
      noiseOffsets.z += 0.00005; // Very slow time progression

      // Update all layers with Vanta-style Perlin noise
      allLayers.forEach((layer) => {
        const ring = layer.layerIndex;
        const chaosDim = chaosDelta * ring + chaosInit;
        
        layer.points.forEach((point, i) => {
          const original = layer.originalPoints[i];
          
          // Calculate angle for this point
          const angle = (i / layer.points.length) * Math.PI * 2;
          
          // Vanta TRUNK noise function
          // Uses angle in polar coordinates with Perlin noise
          let radian = angle % (Math.PI * 2);
          if (radian < 0) radian += Math.PI * 2;
          
          const noiseX = noiseOffsets.x + Math.cos(radian) * chaosDim;
          const noiseY = noiseOffsets.y + Math.sin(radian) * chaosDim;
          const noiseZ = noiseOffsets.z + time * 0.1;
          
          // Get Perlin noise value
          const noiseValue = perlin.noise(noiseX, noiseY, noiseZ);
          
          // Calculate radius with chaos
          const baseRadius = Math.sqrt(original.x * original.x + original.y * original.y);
          const chaosOffset = chaos * chaosMag * noiseValue;
          const newRadius = baseRadius + chaosOffset;
          
          // Apply to point
          const pointAngle = Math.atan2(original.y, original.x);
          point.x = Math.cos(pointAngle) * newRadius;
          point.y = Math.sin(pointAngle) * newRadius;
          point.z = original.z;
        });

        // Update geometry
        layer.line.geometry.setFromPoints(layer.points);

        // Update color - red/pink gradient
        const hue = 0.98 + ring * 0.005 + time * 0.03;
        const intensity = 0.55 + chaos * 0.08;
        const color = new THREE.Color().setHSL(hue % 1, 1.0, intensity);
        (layer.line.material as THREE.LineBasicMaterial).color = color;
      });

      // No rotation - keep it stable like Vanta
      // scene.rotation.z = 0;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      allLayers.forEach(layer => {
        layer.line.geometry.dispose();
        (layer.line.material as THREE.Material).dispose();
      });
      if (audioContext.current) {
        audioContext.current.close();
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 z-0">
      <canvas ref={canvasRef} />
    </div>
  );
};
