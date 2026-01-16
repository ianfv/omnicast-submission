import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export const AudioReactiveBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const dataArray = useRef<Uint8Array<ArrayBuffer> | null>(null);

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
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Create circular wireframe with individual segments
    const segments = 120;
    const rings = 25;
    const points: THREE.Vector3[][] = [];
    const originalPoints: THREE.Vector3[][] = [];
    const spikeTargets: number[][] = []; // Target amplitudes for each point
    const spikeVelocities: number[][] = []; // Velocity for smooth animation

    // Create grid of points in circular pattern
    for (let ring = 0; ring < rings; ring++) {
      points[ring] = [];
      originalPoints[ring] = [];
      spikeTargets[ring] = [];
      spikeVelocities[ring] = [];
      
      const radius = (ring / rings) * 15;
      
      for (let seg = 0; seg < segments; seg++) {
        const angle = (seg / segments) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const z = 0;
        
        const point = new THREE.Vector3(x, y, z);
        points[ring].push(point.clone());
        originalPoints[ring].push(point.clone());
        spikeTargets[ring].push(0);
        spikeVelocities[ring].push(0);
      }
    }

    // Create lines
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });

    const lines: THREE.Line[] = [];

    // Radial lines
    for (let seg = 0; seg < segments; seg++) {
      const geometry = new THREE.BufferGeometry();
      const linePoints: THREE.Vector3[] = [];
      for (let ring = 0; ring < rings; ring++) {
        linePoints.push(points[ring][seg]);
      }
      geometry.setFromPoints(linePoints);
      const line = new THREE.Line(geometry, lineMaterial);
      lines.push(line);
      scene.add(line);
    }

    // Circular lines
    for (let ring = 0; ring < rings; ring++) {
      const geometry = new THREE.BufferGeometry();
      const linePoints = [...points[ring], points[ring][0]]; // Close the circle
      geometry.setFromPoints(linePoints);
      const line = new THREE.Line(geometry, lineMaterial);
      lines.push(line);
      scene.add(line);
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x00d4ff, 2, 100);
    pointLight1.position.set(10, 10, 20);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xb000ff, 2, 100);
    pointLight2.position.set(-10, -10, 20);
    scene.add(pointLight2);

    // Mouse tracking
    const mouse = new THREE.Vector2(0, 0);
    const handleMouseMove = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);

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

    // Animation loop
    const clock = new THREE.Clock();
    let lastSpikeTime = 0;
    const spikeInterval = 0.15; // Spike every 150ms

    const animate = () => {
      const time = clock.getElapsedTime();
      const deltaTime = clock.getDelta();

      let audioIntensity = 0;
      let frequencyBands: number[] = [];

      // Get audio data
      if (analyser.current && dataArray.current) {
        analyser.current.getByteFrequencyData(dataArray.current);
        
        // Calculate overall intensity
        const arr = Array.from(dataArray.current);
        const average = arr.reduce((a, b) => a + b, 0) / arr.length;
        audioIntensity = (average / 255) * 3; // Amplify by 3x for more sensitivity
        
        // Split into frequency bands
        const bandSize = Math.floor(arr.length / 8);
        for (let i = 0; i < 8; i++) {
          const start = i * bandSize;
          const end = start + bandSize;
          const bandSlice = arr.slice(start, end);
          const bandAverage = bandSlice.reduce((a, b) => a + b, 0) / bandSize;
          frequencyBands.push((bandAverage / 255) * 5); // Amplify by 5x
        }
      } else {
        // Simulate audio
        audioIntensity = Math.sin(time * 2) * 0.5 + 0.5;
        for (let i = 0; i < 8; i++) {
          frequencyBands.push(Math.sin(time * (2 + i * 0.5)) * 0.5 + 0.5);
        }
      }

      // Create random spikes based on audio intensity
      if (time - lastSpikeTime > spikeInterval && audioIntensity > 0.3) {
        const numSpikes = Math.floor(audioIntensity * 5) + 2; // 2-7 spikes
        
        for (let i = 0; i < numSpikes; i++) {
          const randomRing = Math.floor(Math.random() * rings);
          const randomSeg = Math.floor(Math.random() * segments);
          const randomBand = Math.floor(Math.random() * frequencyBands.length);
          
          // Set spike target based on frequency band
          spikeTargets[randomRing][randomSeg] = frequencyBands[randomBand] * 8;
        }
        
        lastSpikeTime = time;
      }

      // Update all points
      for (let ring = 0; ring < rings; ring++) {
        for (let seg = 0; seg < segments; seg++) {
          const original = originalPoints[ring][seg];
          const current = points[ring][seg];
          
          // Smooth interpolation to target
          const target = spikeTargets[ring][seg];
          spikeVelocities[ring][seg] += (target - spikeVelocities[ring][seg]) * 0.15;
          
          // Decay spikes over time
          spikeTargets[ring][seg] *= 0.92;
          
          // Calculate direction (outward from center)
          const direction = original.clone().normalize();
          
          // Apply spike
          const spikeAmount = spikeVelocities[ring][seg];
          current.copy(original).add(direction.multiplyScalar(spikeAmount));
          
          // Mouse interaction - push points away
          const mousePos3D = new THREE.Vector3(mouse.x * 20, mouse.y * 20, 0);
          const distanceToMouse = current.distanceTo(mousePos3D);
          
          if (distanceToMouse < 10) {
            const pushDirection = current.clone().sub(mousePos3D).normalize();
            const pushStrength = (1 - distanceToMouse / 10) * 3;
            current.add(pushDirection.multiplyScalar(pushStrength));
          }
          
          // Gentle rotation
          const rotationSpeed = 0.05;
          const angle = Math.atan2(current.y, current.x) + rotationSpeed * deltaTime;
          const radius = Math.sqrt(current.x * current.x + current.y * current.y);
          current.x = Math.cos(angle) * radius;
          current.y = Math.sin(angle) * radius;
        }
      }

      // Update line geometries
      let lineIndex = 0;
      
      // Update radial lines
      for (let seg = 0; seg < segments; seg++) {
        const linePoints: THREE.Vector3[] = [];
        for (let ring = 0; ring < rings; ring++) {
          linePoints.push(points[ring][seg]);
        }
        lines[lineIndex].geometry.setFromPoints(linePoints);
        lineIndex++;
      }
      
      // Update circular lines
      for (let ring = 0; ring < rings; ring++) {
        const linePoints = [...points[ring], points[ring][0]];
        lines[lineIndex].geometry.setFromPoints(linePoints);
        lineIndex++;
      }

      // Update line colors based on audio
      const hue = (time * 0.05) % 0.3 + 0.5;
      const color = new THREE.Color().setHSL(hue, 1.0, 0.4 + audioIntensity * 0.2);
      lines.forEach(line => {
        (line.material as THREE.LineBasicMaterial).color = color;
      });

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
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      lines.forEach(line => {
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
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
