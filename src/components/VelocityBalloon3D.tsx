import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useUI } from '@store/useUI';

// Maxwell–Boltzmann speed sampling via Box-Muller for gaussian components
function sampleGaussian(mean = 0, stdDev = 1) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * stdDev;
}

type Particle = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
};

function initParticles(n: number, radius: number, temperature: number, mass: number, prev?: Particle[]): Particle[] {
  const parts: Particle[] = [];
  // Kinetic theory: kT ~ (1/3) m <v^2> ; v_rms ~ sqrt(3kT/m). We use scaled units.
  const k = 1; // scale constant
  const vRms = Math.sqrt((3 * k * temperature) / Math.max(0.0001, mass));
  const std = vRms / Math.sqrt(3); // std per component

  for (let i = 0; i < n; i++) {
    // if we have previous particles, keep position/velocity when possible to avoid "pop-in"
    if (prev && prev[i]) {
      // smooth re-sample velocity magnitude to target distribution while preserving direction
      const dir = prev[i].velocity.clone().normalize();
      const newV = new THREE.Vector3(
        sampleGaussian(0, std),
        sampleGaussian(0, std),
        sampleGaussian(0, std)
      );
      const v = dir.lengthSq() > 0 ? dir.multiplyScalar(newV.length()) : newV;
      parts.push({
        position: prev[i].position.clone(),
        velocity: v
      });
      continue;
    }

    // random point inside sphere
    const r = radius * Math.cbrt(Math.random());
    const theta = Math.acos(2 * Math.random() - 1);
    const phi = 2 * Math.PI * Math.random();
    const x = r * Math.sin(theta) * Math.cos(phi);
    const y = r * Math.sin(theta) * Math.sin(phi);
    const z = r * Math.cos(theta);
    const position = new THREE.Vector3(x, y, z);
    const velocity = new THREE.Vector3(
      sampleGaussian(0, std),
      sampleGaussian(0, std),
      sampleGaussian(0, std)
    );
    parts.push({ position, velocity });
  }
  return parts;
}

function useBalloonSim(radius: number, particles: number, temperature: number, _mass: number, gravity: boolean, paused: boolean, speedScale: number) {
  // keep speeds as a finite, non-empty array to avoid NaNs in UI
  const [speeds, setSpeeds] = useState<number[]>(new Array(Math.max(1, particles)).fill(0));
  const stateRef = useRef<{
    parts: Particle[];
    radius: number;
    mass: number;
    temperature: number;
  }>({
    parts: initParticles(particles, radius, temperature, 1),
    radius: Math.max(0.8, Math.min(2.2, radius || 1)),
    mass: 1,
    temperature: Math.max(1, temperature || 300)
  });

  // on parameter change, adjust smoothly without re-spawning everything
  const lastParams = useRef({ particles, radius, temperature, mass: 1 });
  // During count increase, ensure new particles spawn inside current sphere
  useEffect(() => {
    const st = stateRef.current;
    // sanitize incoming params to prevent NaNs
    const safeTemp = Math.max(1, temperature || 300);
    const safeRadius = THREE.MathUtils.clamp(radius || st.radius || 1, 0.8, 2.2);
    // change in count
    if (particles !== st.parts.length) {
      if (particles > st.parts.length) {
        const toAdd = particles - st.parts.length;
        const added = initParticles(toAdd, st.radius, safeTemp, 1);
        // clamp positions to inside sphere to avoid initial outside placements due to radius drift
        for (const p of added) {
          const rlen = p.position.length();
          if (rlen > st.radius) p.position.multiplyScalar(st.radius / rlen);
        }
        st.parts.push(...added);
      } else {
        st.parts.length = particles;
      }
    }
    // temperature shift => scale speeds gradually next frames (handled in integrator via targetStd)
    st.radius = safeRadius;
    st.temperature = safeTemp;
    st.mass = 1;
    lastParams.current = { particles, radius: safeRadius, temperature: safeTemp, mass: 1 };
  }, [particles, radius, temperature]);

  // physics integrator
  const dtBase = 0.008;
  const g = gravity ? new THREE.Vector3(0, -9.8, 0) : new THREE.Vector3(0, 0, 0);

  // auto radius controls
  // Wider dynamic range and stronger coupling so radius clearly responds to M and V.
  const minR = 0.8;
  const maxR = 3.2;
  // Choose k so that baseline (N=400, m=1, meanV2≈(vRms^2)≈3kT/m with T≈300 in our scaled units)
  // yields a radius near ~1.4, and grows perceptibly with either N or T.
  const volumeK = 0.005; // stronger mapping N*m*meanV2 -> target volume
  const radiusLerp = 0.12; // faster easing for visible inflation/deflation
  // Hard floor to avoid radius getting pinned at min when state momentarily produces 0 speeds
  const thermalMeanV2Floor = 3 / 1; // m is fixed at 1

  const step = (dt: number) => {
    const st = stateRef.current;
    let R = st.radius;

    // compute target per-axis std from current params (thermostat toward T)
    const k = 1;
    const vRmsTarget = Math.sqrt((3 * k * st.temperature) / 1);
    const stdTarget = vRmsTarget / Math.sqrt(3);
    const speedsLocal: number[] = [];

    // Add a mild thermostat and noise to prevent energy collapse to zero
    const thermostatBlend = 0.06;        // how strongly we pull speeds toward target each substep
    const noiseSigma = stdTarget * 0.02; // small isotropic thermal noise

    for (let i = 0; i < st.parts.length; i++) {
      const p = st.parts[i];

      // thermostat scaling
      const currentStd = p.velocity.length() / Math.sqrt(3);
      const scale = (1 - thermostatBlend) + thermostatBlend * (stdTarget / Math.max(1e-6, currentStd));
      if (Number.isFinite(scale) && scale > 0) {
        p.velocity.multiplyScalar(scale);
      }

      // inject small gaussian noise per component
      p.velocity.x += sampleGaussian(0, noiseSigma);
      p.velocity.y += sampleGaussian(0, noiseSigma);
      p.velocity.z += sampleGaussian(0, noiseSigma);

      // integrate velocity (gravity optional)
      p.velocity.addScaledVector(g, dt);
      // integrate position
      p.position.addScaledVector(p.velocity, dt);

      // collide with spherical boundary: reflect velocity at normal if outside (>= to be strict)
      let r = p.position.length();
      if (r >= R) {
        const n = p.position.clone().normalize();
        // push just inside to avoid re-collide next frame
        p.position.copy(n.multiplyScalar(R - 1e-4));
        // reflect
        const vN = n.clone().multiplyScalar(p.velocity.dot(n));
        const vT = p.velocity.clone().sub(vN);
        p.velocity.copy(vT.sub(vN));
        // tangential jitter proportional to target speed to maintain temperature
        const jitter = 0.04 * vRmsTarget;
        const rand = new THREE.Vector3().randomDirection();
        const tangent = rand.sub(n.clone().multiplyScalar(rand.dot(n)));
        if (tangent.lengthSq() > 1e-8) {
          tangent.normalize();
          p.velocity.addScaledVector(tangent, (Math.random() - 0.5) * jitter);
        }
        r = R;
      }

      // clamp NaNs just in case
      if (!Number.isFinite(p.position.x)) p.position.x = 0;
      if (!Number.isFinite(p.position.y)) p.position.y = 0;
      if (!Number.isFinite(p.position.z)) p.position.z = 0;
      if (!Number.isFinite(p.velocity.x)) p.velocity.x = 0;
      if (!Number.isFinite(p.velocity.y)) p.velocity.y = 0;
      if (!Number.isFinite(p.velocity.z)) p.velocity.z = 0;

      speedsLocal.push(p.velocity.length());
    }

    // compute mean v^2 from current particle speeds with thermal fallback
    const meanV2Local = speedsLocal.length
      ? speedsLocal.reduce((a, b) => a + b * b, 0) / speedsLocal.length
      : 0;
    const finiteMeanV2 = Number.isFinite(meanV2Local) && meanV2Local > 1e-8 ? meanV2Local : (vRmsTarget * vRmsTarget);

    // Independence: radius responds additively to supply (N) and velocity (<v^2>)
    const aSupply = 0.010;
    const bVelocity = 0.050;
    const baseVolume = 0.6;

    const volFromSupply = aSupply * Math.max(1, st.parts.length);
    const volFromVelocity = bVelocity * finiteMeanV2;
    const targetVolume = baseVolume + volFromSupply + volFromVelocity;

    // convert to target radius. Clamp and smooth to avoid popping.
    const targetRadiusRaw = Math.cbrt(Math.max(0, (3 * targetVolume) / (4 * Math.PI)));
    const targetRadius = THREE.MathUtils.clamp(targetRadiusRaw, minR, maxR);

    // Blend current radius toward target
    const growBoost = targetRadius > R ? 1.4 : 1.0;
    R = THREE.MathUtils.lerp(R, targetRadius, Math.min(1, radiusLerp * growBoost));
    st.radius = R;

    // update speeds state with finite values to avoid NaN in UI
    const safeSpeeds = (speedsLocal.length ? speedsLocal : [vRmsTarget]).map(v => (Number.isFinite(v) ? v : 0));
    setSpeeds(safeSpeeds);
  };

  // return interface
  return {
    getParticles: () => stateRef.current.parts,
    getRadius: () => stateRef.current.radius,
    speeds,
    tick: (alpha: number) => {
      if (paused) return;
      const steps = Math.max(1, Math.floor(2 * alpha));
      for (let s = 0; s < steps; s++) step(dtBase * speedScale);
    }
  };
}

function ParticlesMesh({ sim }: { sim: ReturnType<typeof useBalloonSim> }) {
  const meshRef = useRef<THREE.Points>(null);
  const posRef = useRef<Float32Array>(new Float32Array(sim.getParticles().length * 3));

  useFrame((_state, delta) => {
    sim.tick(delta / 0.016);
    const parts = sim.getParticles();

    // Resize buffer if count changed
    if (posRef.current.length !== parts.length * 3) {
      posRef.current = new Float32Array(parts.length * 3);
      const geom = meshRef.current?.geometry as THREE.BufferGeometry | undefined;
      if (geom) {
        geom.setAttribute('position', new THREE.BufferAttribute(posRef.current, 3));
      }
    }

    // Write positions with NaN guards
    const arr = posRef.current;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i].position;
      const x = Number.isFinite(p.x) ? p.x : 0;
      const y = Number.isFinite(p.y) ? p.y : 0;
      const z = Number.isFinite(p.z) ? p.z : 0;
      arr[i * 3 + 0] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }

    const geom = meshRef.current?.geometry as THREE.BufferGeometry | undefined;
    if (geom) {
      geom.attributes.position.needsUpdate = true;
      // Robust bounding sphere compute to avoid NaN log spam
      let hasNaN = false;
      const a = geom.attributes.position.array as Float32Array;
      for (let i = 0; i < a.length; i++) {
        if (!Number.isFinite(a[i])) { hasNaN = true; break; }
      }
      if (!hasNaN) {
        geom.computeBoundingSphere();
      } else {
        // fallback small sphere
        geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1);
      }
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry />
      <pointsMaterial size={0.05} color="#cfe1ff" transparent opacity={0.95} />
    </points>
  );
}

function Balloon({ radius }: { radius: number }) {
  return (
    <mesh>
      <sphereGeometry args={[radius, 64, 64]} />
      <meshPhysicalMaterial
        color="#88aaff"
        transmission={0.86}
        roughness={0.18}
        thickness={0.55}
        clearcoat={1}
        clearcoatRoughness={0.2}
        transparent
        opacity={0.22}
      />
    </mesh>
  );
}

export default function VelocityBalloon3D() {
  const { balloon, setBalloon, animationSpeed } = useUI();
  const speedScale = animationSpeed;
  const sim = useBalloonSim(balloon.radius, balloon.particles, balloon.temperature, 1, balloon.gravity, balloon.paused, speedScale);

  // keep UI store radius in sync with sim radius (so Html badge and readouts match autosize)
  useEffect(() => {
    let raf = 0;
    const sync = () => {
      const r = sim.getRadius();
      // Write back small changes too, otherwise UI may get stuck at min due to clamp
      if (Number.isFinite(r)) {
        setBalloon('radius', r);
      }
      raf = requestAnimationFrame(sync);
    };
    raf = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(raf);
  }, [sim, setBalloon]);

  // derived readouts (scaled)
  const N = balloon.particles;
  const avgV = useMemo(() => {
    const s = sim.speeds;
    if (!s.length) return 0;
    const sum = s.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
    return sum / s.length;
  }, [sim.speeds]);
  const meanV2 = useMemo(() => {
    const s = sim.speeds;
    if (!s.length) return 0;
    const sum = s.reduce((a, b) => a + (Number.isFinite(b) ? b * b : 0), 0);
    return sum / s.length;
  }, [sim.speeds]);
  const volume = (4 / 3) * Math.PI * Math.pow(balloon.radius, 3);
  const pressure = (N * balloon.mass * meanV2) / Math.max(0.001, 3 * volume);

  return (
    <section className="section">
      <div className="card glass">
        <h2 className="h1">Inflation via Balloon Analogy — Particle Simulation</h2>
        <p className="p">
          The balloon models money in an economy. Particle count approximates money supply (M). Particle speeds reflect velocity (V).
          Changes to the sliders now continuously re-scale particle speeds and counts without popping in/out, so you can see velocity visibly increase as you heat the system.
        </p>
      </div>

      <div className="card glass">
        <div className="canvas-wrap" style={{ height: 440 }}>
          {/* Tone-mapped linear colors and sRGB encoding to avoid visual mismatch; preserve scale */}
          <Canvas camera={{ position: [0, 0, 4.6], fov: 55 }} gl={{ preserveDrawingBuffer: false }} dpr={[1, 1.5]}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[3, 3, 3]} intensity={1.1} />
            <ParticlesMesh sim={sim} />
            <Balloon radius={balloon.radius} />
            <OrbitControls enablePan={false} />
            {/* Badge anchored to the balloon surface; prevents appearing inside/outside mistakenly */}
            <Html position={[0, Math.max(0.1, balloon.radius) + 0.2, 0]} transform occlude center>
              <div className="badge">Particles: {balloon.particles} • Radius: {balloon.radius.toFixed(2)}</div>
            </Html>
          </Canvas>
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <div className="panel glass">
            <div className="row">
              <label>Particles (≈ Money Supply, M)</label>
              <input className="range" type="range" min={50} max={4000} step={10}
                value={balloon.particles} onChange={e => setBalloon('particles', +e.target.value)} />
              <span className="badge">{balloon.particles}</span>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <label>Temperature (scales speed, ≈ Velocity, V)</label>
              <input className="range" type="range" min={50} max={1500} step={10}
                value={balloon.temperature} onChange={e => setBalloon('temperature', +e.target.value)} />
              <span className="badge">{balloon.temperature}</span>
            </div>
            {/* Mass control removed; mass is fixed at 1.0 */}
            {/* Remove manual radius control: autosizing only */}
            <div className="row" style={{ marginTop: 8 }}>
              <label>Gravity</label>
              <input type="checkbox" checked={balloon.gravity} onChange={e => setBalloon('gravity', e.target.checked)} />
              <span className="small">Adds slight downward bias</span>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="button" onClick={() => setBalloon('paused', !balloon.paused)}>
                {balloon.paused ? 'Resume' : 'Pause'}
              </button>
              <button className="button" onClick={() => {
                // gentle reset: rebuild with previous state to avoid pop
                const prev = sim.getParticles().map(p => ({ position: p.position.clone(), velocity: p.velocity.clone() }));
                // small nudge to trigger useEffect without destroying continuity
                setBalloon('particles', balloon.particles + 1);
                setTimeout(() => setBalloon('particles', balloon.particles), 0);
              }}>Reset</button>
            </div>
          </div>

          <div className="panel glass">
            <div className="small">Thermodynamic readouts (scaled units)</div>
            <div className="p">⟨v⟩ (mean speed): <b>{avgV.toFixed(2)}</b></div>
            <div className="p">⟨v²⟩: <b>{meanV2.toFixed(2)}</b></div>
            <div className="p">Radius (auto): <b>{balloon.radius.toFixed(2)}</b></div>
            <div className="p">Volume: <b>{volume.toFixed(2)}</b></div>
            <div className="p">Pressure proxy n·m·⟨v²⟩ / (3V): <b>{pressure.toFixed(3)}</b></div>
            <div className="small">Note: Radius is auto-sized from independent contributions of supply (N) and velocity (⟨v²⟩). Increasing either one increases size; neither slider affects the other.</div>
          </div>
        </div>
      </div>

      <div className="card glass">
        <h3 className="h2">How this maps to inflation</h3>
        <ul className="p">
          <li>More particles (M↑) with the same volume cause higher average wall impacts → higher “pressure” on prices.</li>
          <li>Higher temperature (V↑) increases particle speed → more frequent/energetic impacts → inflationary pressure.</li>
          <li>Increasing volume (capacity/output) offsets pressure for the same M,V.</li>
        </ul>
        <p className="small">This analogy omits many real-world frictions (expectations, supply shocks, price stickiness). Use it to build intuition, not to forecast.</p>
      </div>
    </section>
  );
}