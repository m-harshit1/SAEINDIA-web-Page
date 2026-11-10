'use client';

import React, { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html, Center } from '@react-three/drei';
import * as THREE from 'three';

type ColorScheme = 'livery' | 'red' | 'titanium';

function ActualGLTFModel({ colorScheme }: { colorScheme: ColorScheme }) {
  const modelRef = useRef<THREE.Group>(null);
  const gltf = useGLTF('/assets/b26_draco.glb', '/draco/');

  React.useLayoutEffect(() => {
    if (!gltf.scene) return;
    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (mesh.geometry) {
          mesh.geometry.computeVertexNormals();
        }

        if (colorScheme === 'livery') {
          // Team livery, same as the home story: the model's red/pink parts → racing red,
          // bright hardware → chrome, everything else → gloss black.
          const geo = mesh.geometry;
          const col = geo.getAttribute('color') as THREE.BufferAttribute | undefined;
          if (col && !geo.userData.liveried) {
            const c = new THREE.Color(), hsl = { h: 0, s: 0, l: 0 };
            const out = new Float32Array(col.count * 3);
            for (let i = 0; i < col.count; i++) {
              c.setRGB(col.getX(i), col.getY(i), col.getZ(i));
              c.getHSL(hsl);
              const deg = hsl.h * 360;
              if (hsl.s > 0.35 && hsl.l > 0.12 && (deg >= 290 || deg < 14)) out.set([0.72, 0.012, 0], i * 3);
              else if (hsl.l > 0.62) out.set([0.62, 0.62, 0.64], i * 3);
              else out.set([0.018, 0.018, 0.02], i * 3);
            }
            geo.setAttribute('color', new THREE.BufferAttribute(out, 3));
            geo.userData.liveried = true;
          }
          mesh.material = new THREE.MeshPhysicalMaterial({
            vertexColors: true,
            metalness: 0.3,
            roughness: 0.22,
            clearcoat: 1,
            clearcoatRoughness: 0.05,
            side: THREE.DoubleSide,
          });
        } else if (colorScheme === 'red') {
          // Monochrome Apex Racing Red
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#FF1E0A'),
            metalness: 0.6,
            roughness: 0.25,
            side: THREE.DoubleSide,
          });
        } else {
          // Machined Studio Titanium / Spec CAD
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#CBD5E1'),
            metalness: 0.75,
            roughness: 0.2,
            side: THREE.DoubleSide,
          });
        }
      }
    });
  }, [gltf, colorScheme]);

  return (
    <group ref={modelRef}>
      <Center>
        <primitive object={gltf.scene} />
      </Center>
    </group>
  );
}

function FallbackWireframe() {
  const modelRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!modelRef.current) return;
    modelRef.current.rotation.y = state.clock.getElapsedTime() * 0.1;
  });

  return (
    <group ref={modelRef}>
      <Center>
        <group>
          <mesh name="chassis" position={[0, 0, 0]}>
            <boxGeometry args={[1.2, 0.6, 2.4]} />
            <meshStandardMaterial color="#FF334B" wireframe={true} />
          </mesh>
          <mesh name="powertrain" position={[0, 0, -0.8]}>
            <cylinderGeometry args={[0.35, 0.35, 0.7]} />
            <meshStandardMaterial color="#FF3B1F" wireframe={true} />
          </mesh>
        </group>
      </Center>
    </group>
  );
}

function VehicleModel({ colorScheme }: { colorScheme: ColorScheme }) {
  const [modelExists, setModelExists] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    fetch('/assets/b26_draco.glb', { method: 'HEAD' })
      .then(res => setModelExists(res.ok))
      .catch(() => setModelExists(false));
  }, []);

  if (modelExists === null) return null;

  return modelExists ? <ActualGLTFModel colorScheme={colorScheme} /> : <FallbackWireframe />;
}

export default function VehicleView3D() {
  const [colorScheme, setColorScheme] = useState<ColorScheme>('livery');

  return (
    <div className="w-full h-[460px] md:h-[640px] bg-[radial-gradient(ellipse_at_50%_35%,#1a0d0c,#070708_65%)] border border-white/10 rounded-3xl relative overflow-hidden group select-none shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]">

      {/* 3D Canvas Context Runtime Container */}
      <Canvas camera={{ position: [3.2, 2.2, 4.2], fov: 45 }} gl={{ antialias: true }}>
        {/* transparent canvas: the container's red-lit gradient shows through */}
        
        {/* High-Contrast Dynamic Motorsport Studio Lighting */}
        <ambientLight intensity={1.2} />
        {/* Primary Key Light */}
        <directionalLight position={[10, 16, 12]} intensity={2.8} color="#FFFFFF" castShadow />
        {/* Cool Rim Silhouette Light for edge definition */}
        <directionalLight position={[-12, 10, -10]} intensity={2.2} color="#E0F2FE" />
        {/* Warm Accent Fill */}
        <directionalLight position={[-10, 6, 10]} intensity={1.6} color="#FFE4E6" />
        {/* Ground Reflection Bounce */}
        <directionalLight position={[0, -6, 2]} intensity={1.0} color="#94A3B8" />
        {/* Front Specular Highlight */}
        <directionalLight position={[0, 8, 10]} intensity={2.4} color="#FFFFFF" />
        <pointLight position={[0, 5, 0]} intensity={1.8} color="#FFF1F2" />

        <Suspense fallback={
          <Html center className="whitespace-nowrap font-mono text-[10px] text-white/50 uppercase tracking-[0.35em]">
            Loading the B-26…
          </Html>
        }>
          <VehicleModel colorScheme={colorScheme} />
        </Suspense>

        {/* Technical CAD Ground Plane Grid */}
        <gridHelper args={[10, 20, '#E10600', '#1d1d22']} position={[0, -1.38, 0]} />

        {/* 360 Turntable OrbitControls */}
        <OrbitControls
          enableZoom={true}
          maxDistance={9}
          minDistance={2}
          autoRotate={true}
          autoRotateSpeed={0.8}
          maxPolarAngle={Math.PI / 2 + 0.05}
        />
      </Canvas>

      {/* Top Left: Watermark & CAD Specs */}
      <div className="absolute top-5 left-5 pointer-events-none">
        <div className="font-display font-semibold text-lg sm:text-2xl text-white tracking-[-0.03em] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-apex-red animate-pulse" />
          B-26 full assembly
        </div>
        <div className="hidden sm:flex font-mono text-[10px] md:text-xs text-slate-400 mt-2 flex-col gap-1 bg-black/50 backdrop-blur-md p-3 rounded-2xl border border-white/10">
          <span className="text-white/80 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-apex-red animate-pulse" />
            SolidWorks AP203 CAD Online
          </span>
          <span>Mesh Faces: 910,449 Polygons (High-Contrast CAD Assembly)</span>
          <span>Source: BAJA_FULL_ASSEMBB;Y.STEP (257 MB)</span>
        </div>
      </div>

      {/* Top Right: Color & Contrast Palette Switcher */}
      <div className="absolute bottom-4 left-4 sm:bottom-auto sm:left-auto sm:top-5 sm:right-5 flex items-center gap-1.5 bg-black/50 backdrop-blur-md p-1 rounded-full border border-white/10">
        <span className="font-mono text-[9px] uppercase font-bold text-slate-400 px-2 hidden sm:inline">Theme:</span>
        <button
          onClick={() => setColorScheme('livery')}
          className={`whitespace-nowrap px-3 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
            colorScheme === 'livery'
              ? 'btn-gloss text-white'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          title="Motorsport Livery: Dark rubber tires, chrome rims, apex red roll cage, and orange suspension"
        >
          Team Livery
        </button>
        <button
          onClick={() => setColorScheme('red')}
          className={`whitespace-nowrap px-3 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
            colorScheme === 'red'
              ? 'btn-gloss text-white'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          title="Monochrome Apex Racing Red with metallic sheen"
        >
          Apex Red
        </button>
        <button
          onClick={() => setColorScheme('titanium')}
          className={`whitespace-nowrap px-3 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
            colorScheme === 'titanium'
              ? 'bg-slate-200 text-carbon-900 shadow-md shadow-white/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          title="Brushed Titanium CAD Studio finish"
        >
          Titanium CAD
        </button>
      </div>

      {/* Bottom Right: Interactive Navigation Hint */}
      <div className="absolute bottom-4 right-4 pointer-events-none hidden sm:block">
        <div className="font-mono text-[10px] text-slate-400 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
          Click &amp; drag to rotate • Scroll to zoom • Right-click to pan
        </div>
      </div>
    </div>
  );
}
