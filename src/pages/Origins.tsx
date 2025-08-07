import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Agent-based barter to money emergence simulation
type Good = 'fish' | 'grain' | 'tool' | 'bead';

type Agent = {
  pos: THREE.Vector3;
  // what they currently hold
  inv: Good;
  // what they want
  want: Good;
};

// utility to pick weighted preference (beads have slightly higher social desirability to show emergence)
const GOODS: Good[] = ['fish', 'grain', 'tool', 'bead'];
function randomGood(pref?: Good): Good {
  if (!pref) return GOODS[Math.floor(Math.random() * GOODS.length)];
  return pref;
}

function useAgents(count = 28) {
  const agentsRef = useRef<Agent[]>([]);
  if (agentsRef.current.length === 0) {
    agentsRef.current = Array.from({ length: count }).map(() => {
      const a = (Math.random() - 0.5) * 6;
      const b = (Math.random() - 0.5) * 6;
      return {
        pos: new THREE.Vector3(a, (Math.random() - 0.5) * 0.4, b),
        inv: randomGood(),
        want: randomGood(),
      };
    });
  }
  return agentsRef;
}

function colorForGood(g: Good) {
  switch (g) {
    case 'fish': return '#6ab7ff';
    case 'grain': return '#95d5b2';
    case 'tool': return '#ffd166';
    case 'bead': return '#c9b037';
  }
}

function AgentDots({ agents }: { agents: React.MutableRefObject<Agent[]> }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4, metalness: 0.1 });
  const dummy = new THREE.Object3D();

  useFrame(() => {
    const m = meshRef.current;
    if (!m) return;
    for (let i = 0; i < agents.current.length; i++) {
      const a = agents.current[i];
      dummy.position.copy(a.pos);
      dummy.scale.setScalar(0.12);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      const c = new THREE.Color(colorForGood(a.inv));
      m.setColorAt(i, c);
    }
    m.instanceMatrix.needsUpdate = true;
    (m as any).instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined as any, undefined as any, agents.current.length]}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshStandardMaterial attach="material" color="#ffffff" />
    </instancedMesh>
  );
}

function ExchangeLines({ pairs }: { pairs: Array<[THREE.Vector3, THREE.Vector3]> }) {
  return (
    <group>
      {pairs.map((p, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[new Float32Array([p[0].x, p[0].y, p[0].z, p[1].x, p[1].y, p[1].z]), 3]} />
          </bufferGeometry>
          <lineBasicMaterial color="#6ab7ff" linewidth={2} />
        </line>
      ))}
    </group>
  );
}

function BarterSim() {
  const agents = useAgents(40);
  const [pairs, setPairs] = useState<Array<[THREE.Vector3, THREE.Vector3]>>([]);
  const beadScoreRef = useRef(0);

  useFrame((_s, dt) => {
    // random walk agents slightly
    for (const a of agents.current) {
      a.pos.x += (Math.random() - 0.5) * 0.02;
      a.pos.z += (Math.random() - 0.5) * 0.02;
    }

    // attempt trades: if two close agents meet, they try to exchange
    const newPairs: Array<[THREE.Vector3, THREE.Vector3]> = [];
    for (let i = 0; i < agents.current.length; i++) {
      for (let j = i + 1; j < agents.current.length; j++) {
        const a = agents.current[i], b = agents.current[j];
        if (a.pos.distanceTo(b.pos) < 0.6) {
          // if a wants what b has and b wants what a has → direct barter
          if (a.want === b.inv && b.want === a.inv) {
            const tmp = a.inv; a.inv = b.inv; b.inv = tmp;
            // after exchange, pick new wants (beads slightly more likely as portable store)
            a.want = Math.random() < 0.35 ? 'bead' : randomGood();
            b.want = Math.random() < 0.35 ? 'bead' : randomGood();
            newPairs.push([a.pos.clone(), b.pos.clone()]);
          } else {
            // if a cannot get want, but sees b holds beads, accept beads as intermediate with higher chance
            const aTakesBead = b.inv === 'bead' && Math.random() < 0.6;
            const bTakesBead = a.inv === 'bead' && Math.random() < 0.6;
            if (aTakesBead || bTakesBead) {
              if (aTakesBead) { const tmp = a.inv; a.inv = b.inv; b.inv = tmp; newPairs.push([a.pos.clone(), b.pos.clone()]); }
              if (bTakesBead) { const tmp2 = a.inv; a.inv = b.inv; b.inv = tmp2; newPairs.push([a.pos.clone(), b.pos.clone()]); }
              beadScoreRef.current += 1;
            }
          }
        }
      }
    }
    setPairs(newPairs.slice(0, 50)); // show some lines this frame only
  });

  // compute share of beads as medium in circulation for HUD
  const beadShare = useMemo(() => {
    return () => {
      const beadHolders = agents.current.filter(a => a.inv === 'bead').length;
      return Math.round((beadHolders / agents.current.length) * 100);
    };
  }, [agents]);

  return (
    <>
      <AgentDots agents={agents} />
      <ExchangeLines pairs={pairs} />
      <Html center position={[0, 1.6, 0]}>
        <div className="badge">Bead share in circulation (proxy for common medium): ~{beadShare()}%</div>
      </Html>
    </>
  );
}

export default function Origins() {
  return (
    <section className="section">
      <div className="card glass">
        <h2 className="h1">Origins: Barter → Common Money</h2>
        <p className="p">
          People start with what they produce and try to trade for what they want. Direct swaps often fail:
          timings don’t match or needs don’t align. Over time, traders notice certain items are accepted by most
          people and are easy to carry and split. They begin to take those items—like beads—purely because they
          can use them later with anyone else. That’s a common medium of exchange.
        </p>
        <p className="p">
          Watch below: agents wander and trade. If they can’t get exactly what they want, they often accept beads as
          a step in-between. As more do this, the chance that beads are accepted rises—a self-reinforcing loop.
        </p>
      </div>

      <div className="canvas-wrap" style={{ height: 440 }}>
        <Canvas camera={{ position: [0, 2.2, 5], fov: 55 }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[3, 5, 2]} intensity={1.1} />
          <BarterSim />
          <OrbitControls enablePan={false} />
        </Canvas>
      </div>

      <div className="card glass">
        <h3 className="h2">Why these items win</h3>
        <ul className="p">
          <li>Durability: don’t rot (unlike fish)</li>
          <li>Portability: light and easy to carry (beads, coins)</li>
          <li>Divisibility and uniformity: easy to count and split</li>
          <li>Scarcity: can’t be created freely, so they keep value</li>
        </ul>
        <p className="small">This simulation is qualitative. Its point is to show convergence on a shared “currency” because it reduces the friction of finding perfect trade matches.</p>
      </div>
    </section>
  );
}