import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const AudioParticleCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    camera.position.set(0, 15, 35);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Flowing wave layers - smooth continuous waves
    const waveCount = 8; // Number of wave layers
    const waves: {
      geometry: THREE.PlaneGeometry;
      mesh: THREE.Mesh;
      material: THREE.MeshStandardMaterial;
      index: number;
    }[] = [];

    const waveWidth = 80;
    const waveDepth = 80;
    const waveSegments = 100;

    for (let i = 0; i < waveCount; i++) {
      const geometry = new THREE.PlaneGeometry(
        waveWidth,
        waveDepth,
        waveSegments,
        waveSegments
      );

      // Color gradient from cyan to purple
      const hue = (i / waveCount) * 0.25 + 0.5; // 0.5 = cyan, 0.75 = purple
      const color = new THREE.Color().setHSL(hue, 1.0, 0.5);

      const material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        wireframe: false,
      });

      const mesh = new THREE.Mesh(geometry, material);
      
      // Rotate to be horizontal and position in layers
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = i * 1.5 - (waveCount * 1.5) / 2;
      
      scene.add(mesh);

      waves.push({
        geometry,
        mesh,
        material,
        index: i,
      });
    }

    // No ground plane needed for wave layers

    // Lighting - optimized for flowing waves
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x00d4ff, 2.0, 200);
    pointLight1.position.set(20, 20, 20);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xb000ff, 2.0, 200);
    pointLight2.position.set(-20, 20, 20);
    scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0xff006e, 1.5, 150);
    pointLight3.position.set(0, -10, 30);
    scene.add(pointLight3);

    // Mouse tracking
    const mouse = new THREE.Vector3(0, 0, 10);
    const handleMouseMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;

      const vector = new THREE.Vector3(x, y, 0.5);
      vector.unproject(camera);

      const dir = vector.sub(camera.position).normalize();
      const distance = -camera.position.z / dir.z;
      mouse.copy(camera.position.clone().add(dir.multiplyScalar(distance)));
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Animation loop
    const clock = new THREE.Clock();
    const animate = () => {
      const time = clock.getElapsedTime();

      // Simulated audio frequencies
      const bassFreq = Math.sin(time * 1.5) * 0.5 + 0.5;
      const midFreq = Math.sin(time * 2.3) * 0.5 + 0.5;
      const trebleFreq = Math.sin(time * 3.7) * 0.5 + 0.5;

      waves.forEach((wave) => {
        const positions = wave.geometry.attributes.position.array as Float32Array;
        const vertexCount = positions.length / 3;

        for (let i = 0; i < vertexCount; i++) {
          const i3 = i * 3;
          const x = positions[i3];
          const y = positions[i3 + 1];

          // Create flowing wave motion
          const waveSpeed = 0.8 + wave.index * 0.1;
          const waveFrequency = 0.15 - wave.index * 0.01;
          
          // Multiple sine waves for complex motion
          const wave1 = Math.sin(x * waveFrequency + time * waveSpeed) * 3;
          const wave2 = Math.cos(y * waveFrequency * 0.8 + time * waveSpeed * 0.7) * 2;
          const wave3 = Math.sin((x + y) * waveFrequency * 0.5 + time * waveSpeed * 1.2) * 1.5;
          
          // Audio reactivity - different layers respond to different frequencies
          let audioAmplitude;
          if (wave.index < 3) {
            audioAmplitude = bassFreq * 4;
          } else if (wave.index < 6) {
            audioAmplitude = midFreq * 3;
          } else {
            audioAmplitude = trebleFreq * 2;
          }

          // Mouse interaction - create ripples
          const dx = x - (mouse.x * 2);
          const dy = y - (mouse.z * 2);
          const distanceToMouse = Math.sqrt(dx * dx + dy * dy);
          const mouseInfluence = Math.max(0, 1 - distanceToMouse / 25);
          const mouseRipple = mouseInfluence > 0 ? Math.sin(distanceToMouse * 0.5 - time * 3) * mouseInfluence * 8 : 0;

          // Combine all effects
          const z = wave1 + wave2 + wave3 + audioAmplitude + mouseRipple;
          positions[i3 + 2] = z;
        }

        wave.geometry.attributes.position.needsUpdate = true;
        wave.geometry.computeVertexNormals();

        // Update colors based on audio
        const hue = (wave.index / waveCount) * 0.25 + 0.5 + time * 0.03;
        const intensity = 0.4 + (bassFreq + midFreq + trebleFreq) / 3 * 0.3;
        const color = new THREE.Color().setHSL(hue % 1, 1.0, 0.5);
        
        wave.material.color = color;
        wave.material.emissive = color;
        wave.material.emissiveIntensity = intensity;
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
      waves.forEach(wave => {
        wave.geometry.dispose();
        wave.material.dispose();
      });
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 z-0">
      <canvas ref={canvasRef} />
    </div>
  );
};
