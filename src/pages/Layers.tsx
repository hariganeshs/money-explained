import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';

function Gap() {
  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[5.2, 0.02, 3]} />
      <meshStandardMaterial color="#0a0f24" transparent opacity={0.2} />
    </mesh>
  );
}

function Layer({ y, color, label, w, d }: { y: number; color: string; label: string; w: number; d: number }) {
  return (
    <group position={[0, y, 0]}>
      <mesh>
        <boxGeometry args={[w, 0.3, d]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.1} />
      </mesh>
      <Html center position={[0, 0.34, 0]}>
        <div className="badge" style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.25)' }}>{label}</div>
      </Html>
    </group>
  );
}

export default function Layers() {
  return (
    <section className="section">
      <div className="card glass">
        <h2 className="h1">Layered Money</h2>
        <p className="p">
          Fast, flexible layers sit atop a slower, more trustable settlement layer. Historically, gold
          served as the base layer; later, central bank reserves. Upper layers include demand deposits,
          credit, and other instruments—great for speed but ultimately settling back to base.
        </p>
        <p className="p">
          We added clear vertical gaps to reveal labels between layers for readability. Watch how upper layers are narrower and “lighter”.
        </p>
      </div>
      <div className="canvas-wrap" style={{ height: 420 }}>
        <Canvas camera={{ position: [3.2, 2.8, 4.6], fov: 50 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[4, 6, 3]} intensity={1.0} />
          <group position={[0, -0.4, 0]}>
            <Layer y={0} color="#3e5fbf" label="Base layer: Reserves (M0 / settlement)" w={4.6} d={2.6} />
            <Gap />
            <Layer y={0.6} color="#5aa7e8" label="Deposits & Payments (M1/M2)" w={3.8} d={2.2} />
            <Gap />
            <Layer y={1.2} color="#7ed6a6" label="Credit & Markets" w={3.0} d={1.8} />
            <Gap />
            <Layer y={1.8} color="#ffd166" label="Derivatives & Instruments" w={2.2} d={1.3} />
          </group>
          <OrbitControls />
        </Canvas>
      </div>
    </section>
  );
}