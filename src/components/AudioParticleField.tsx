import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  originalPosition: THREE.Vector3;
  phase: number;
  amplitude: number;
}

export const AudioParticleField = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particleCount = 4000;
  const mousePosition = useRef(new THREE.Vector3(0, 0, 10));
  const { size, camera } = useThree();
  
  // Create particles with initial positions
  const particles = useMemo(() => {
    const particlesArray: Particle[] = [];
    const spread = 50;
    
    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() - 0.5) * spread;
      const y = (Math.random() - 0.5) * spread;
      const z = (Math.random() - 0.5) * spread;
      
      particlesArray.push({
        position: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(0, 0, 0),
        originalPosition: new THREE.Vector3(x, y, z),
        phase: Math.random() * Math.PI * 2,
        amplitude: Math.random() * 0.5 + 0.5,
      });
    }
    
    return particlesArray;
  }, [particleCount]);

  // Connection lines
  const linesRef = useRef<THREE.LineSegments>(null);
  const maxConnections = 1000;
  
  const lineGeometry = useMemo(() => {
    const positions = new Float32Array(maxConnections * 6);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [maxConnections]);

  // Mouse tracking
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const x = (event.clientX / size.width) * 2 - 1;
      const y = -(event.clientY / size.height) * 2 + 1;
      
      const vector = new THREE.Vector3(x, y, 0.5);
      vector.unproject(camera);
      
      const dir = vector.sub(camera.position).normalize();
      const distance = -camera.position.z / dir.z;
      mousePosition.current = camera.position.clone().add(dir.multiplyScalar(distance));
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [size, camera]);

  // Animation loop
  useFrame((state) => {
    if (!meshRef.current || !linesRef.current) return;

    const time = state.clock.getElapsedTime();
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    
    // Simulate audio frequencies
    const bassFreq = Math.sin(time * 2) * 0.5 + 0.5;
    const midFreq = Math.sin(time * 3) * 0.5 + 0.5;
    const trebleFreq = Math.sin(time * 5) * 0.5 + 0.5;
    
    // Connection lines data
    const linePositions = lineGeometry.attributes.position.array as Float32Array;
    let connectionCount = 0;
    
    particles.forEach((particle, i) => {
      // Wave motion with audio reactivity
      const waveX = Math.sin(time + particle.phase) * particle.amplitude * (1 + bassFreq);
      const waveY = Math.cos(time * 0.5 + particle.phase) * particle.amplitude * (1 + midFreq);
      const waveZ = Math.sin(time * 0.3 + particle.phase) * particle.amplitude * (1 + trebleFreq);
      
      // Target position with wave
      const targetX = particle.originalPosition.x + waveX;
      const targetY = particle.originalPosition.y + waveY;
      const targetZ = particle.originalPosition.z + waveZ;
      
      // Mouse interaction force
      const mouseDistance = particle.position.distanceTo(mousePosition.current);
      const mouseForce = Math.max(0, 1 - mouseDistance / 15);
      
      if (mouseForce > 0) {
        const direction = particle.position.clone().sub(mousePosition.current).normalize();
        const repelForce = mouseForce * 0.3;
        
        particle.velocity.add(direction.multiplyScalar(repelForce));
      }
      
      // Apply forces
      particle.velocity.x += (targetX - particle.position.x) * 0.02;
      particle.velocity.y += (targetY - particle.position.y) * 0.02;
      particle.velocity.z += (targetZ - particle.position.z) * 0.02;
      
      // Damping
      particle.velocity.multiplyScalar(0.92);
      
      // Update position
      particle.position.add(particle.velocity);
      
      // Set instance position
      dummy.position.copy(particle.position);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      
      // Color based on position and audio
      const hue = (particle.position.y / 50 + 0.5 + time * 0.1 + bassFreq * 0.2) % 1;
      const saturation = 0.8 + midFreq * 0.2;
      const lightness = 0.4 + trebleFreq * 0.3;
      color.setHSL(hue * 0.3 + 0.5, saturation, lightness);
      meshRef.current!.setColorAt(i, color);
      
      // Connection lines (limited to prevent performance issues)
      if (connectionCount < maxConnections) {
        for (let j = i + 1; j < Math.min(i + 5, particles.length); j++) {
          const distance = particle.position.distanceTo(particles[j].position);
          if (distance < 5) {
            const idx = connectionCount * 6;
            linePositions[idx] = particle.position.x;
            linePositions[idx + 1] = particle.position.y;
            linePositions[idx + 2] = particle.position.z;
            linePositions[idx + 3] = particles[j].position.x;
            linePositions[idx + 4] = particles[j].position.y;
            linePositions[idx + 5] = particles[j].position.z;
            connectionCount++;
            if (connectionCount >= maxConnections) break;
          }
        }
      }
    });
    
    // Clear unused line positions
    for (let i = connectionCount * 6; i < linePositions.length; i++) {
      linePositions[i] = 0;
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
    lineGeometry.attributes.position.needsUpdate = true;
  });

  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.5} color="#00d4ff" />
      <pointLight position={[-10, -10, 10]} intensity={0.5} color="#b000ff" />
      
      {/* Particle system */}
      <instancedMesh ref={meshRef} args={[undefined, undefined, particleCount]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial
          emissive="#ffffff"
          emissiveIntensity={0.5}
          toneMapped={false}
        />
      </instancedMesh>
      
      {/* Connection lines */}
      <lineSegments ref={linesRef} geometry={lineGeometry}>
        <lineBasicMaterial
          color="#00d4ff"
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
      
      {/* Atmospheric fog */}
      <fog attach="fog" args={['#050505', 20, 60]} />
    </>
  );
};
