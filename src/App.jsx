import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { EffectComposer, GodRays } from '@react-three/postprocessing'
import { useRef, useState, useMemo, Fragment, forwardRef } from 'react'
import * as THREE from 'three'

// --- UI Components ---

function InfoPanel({ data, onClose }) {
  if (!data) return null;
  const isLocation = 'lat' in data;
  return (
    <div className="info-panel">
      <h2>{isLocation ? 'Location Details' : data.name}</h2>
      {isLocation ? (
        <>
          <p>Latitude: {data.lat.toFixed(2)}°</p>
          <p>Longitude: {data.lon.toFixed(2)}°</p>
          <p>Estimated Time: <strong>{data.time}</strong></p>
        </>
      ) : (
        <p>Size: {data.size}x Earth</p>
      )}
      <button onClick={onClose}>Close</button>
    </div>
  );
}

function TimeControls({ setTimeScale, timeScale }) {
  return (
    <div className="time-controls">
      <h4>Time Controls</h4>
      <button onClick={() => setTimeScale(0)} className={timeScale === 0 ? 'active' : ''}>Pause</button>
      <button onClick={() => setTimeScale(0.1)} className={timeScale === 0.1 ? 'active' : ''}>Slow</button>
      <button onClick={() => setTimeScale(1)} className={timeScale === 1 ? 'active' : ''}>Normal</button>
      <button onClick={() => setTimeScale(5)} className={timeScale === 5 ? 'active' : ''}>Fast</button>
    </div>
  )
}

// --- 3D Components ---

function Orbit({ distance }) {
  const points = useMemo(() => {
    const curve = new THREE.EllipseCurve(0, 0, distance, distance, 0, 2 * Math.PI, false, 0);
    return curve.getPoints(128);
  }, [distance]);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return (
    <line geometry={geometry} rotation-x={Math.PI / 2}>
      <lineBasicMaterial attach="material" color="#333333" />
    </line>
  );
}

function Moon({ moonData, timeScale }) {
    const moonRef = useRef();
    const simulationTime = useRef(0);
    useFrame((state, delta) => {
        simulationTime.current += delta * timeScale;
        const elapsedTime = simulationTime.current;
        if (moonRef.current) {
            moonRef.current.position.x = Math.sin(elapsedTime * moonData.orbitSpeed) * moonData.distance;
            moonRef.current.position.z = Math.cos(elapsedTime * moonData.orbitSpeed) * moonData.distance;
        }
    });
    return (
        <mesh ref={moonRef}>
            <sphereGeometry args={[moonData.size, 16, 16]} />
            <meshStandardMaterial color={moonData.color} />
        </mesh>
    )
}

function Planet({ planetData, onClick, timeScale }) {
  const groupRef = useRef();
  const planetRef = useRef();
  const simulationTime = useRef(0);
  useFrame((state, delta) => {
    simulationTime.current += delta * timeScale;
    const elapsedTime = simulationTime.current;
    if (planetRef.current) planetRef.current.rotation.y = elapsedTime * planetData.rotationSpeed;
    if (groupRef.current) {
      groupRef.current.position.x = Math.sin(elapsedTime * planetData.orbitSpeed) * planetData.distance;
      groupRef.current.position.z = Math.cos(elapsedTime * planetData.orbitSpeed) * planetData.distance;
    }
  });
  const handleClick = (event) => {
    event.stopPropagation();
    if (planetData.name === 'Earth') onClick(planetData, event.point);
    else onClick(planetData, null);
  };
  return (
    <group ref={groupRef}>
      <mesh ref={planetRef} onClick={handleClick}>
        <sphereGeometry args={[planetData.size, 32, 32]} />
        <meshStandardMaterial color={planetData.color} />
      </mesh>
      {planetData.ring && (
        <mesh rotation-x={Math.PI / 2}>
          <ringGeometry args={[planetData.ring.innerRadius, planetData.ring.outerRadius, 64]} />
          <meshBasicMaterial color={planetData.ring.color} side={THREE.DoubleSide} transparent={true} opacity={0.7} />
        </mesh>
      )}
      {planetData.moons?.map(moon => <Moon key={moon.name} moonData={moon} timeScale={timeScale * 5} />)}
    </group>
  );
}

function AsteroidBelt() {
    const count = 2000;
    const particles = useMemo(() => {
        const temp = [];
        const innerRadius = 26;
        const outerRadius = 38;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = (Math.random() - 0.5) * 2;
            temp.push({ position: [x, y, z], scale: Math.random() * 0.1 + 0.05 });
        }
        return temp;
    }, []);
    return (
        <group>
            {particles.map((p, i) => (
                <mesh key={i} position={p.position} scale={p.scale}>
                    <dodecahedronGeometry args={[0.1, 0]} />
                    <meshStandardMaterial color="#5c5c5c" />
                </mesh>
            ))}
        </group>
    );
}

const Sun = forwardRef((props, ref) => (
    <mesh ref={ref}>
      <sphereGeometry args={[3.5, 64, 64]} />
      <meshStandardMaterial color="yellow" emissive="yellow" emissiveIntensity={2} />
      <pointLight castShadow intensity={200} distance={1000} />
    </mesh>
));

// --- Main App Component ---
function App() {
  const [panelData, setPanelData] = useState(null);
  const [timeScale, setTimeScale] = useState(1);
  const sunRef = useRef();

  const planets = [
    { name: "Mercury", color: "gray", size: 0.4, distance: 8, rotationSpeed: 0.2, orbitSpeed: 0.4 },
    { name: "Venus", color: "orange", size: 0.6, distance: 12, rotationSpeed: 0.1, orbitSpeed: 0.25 },
    { name: "Earth", color: "royalblue", size: 0.65, distance: 17, rotationSpeed: 0.5, orbitSpeed: 0.2, moons: [{ name: 'Moon', size: 0.15, distance: 1.2, orbitSpeed: 2, color: 'lightgray' }] },
    { name: "Mars", color: "orangered", size: 0.5, distance: 24, rotationSpeed: 0.4, orbitSpeed: 0.15 },
    { name: "Jupiter", color: "sandybrown", size: 2.0, distance: 40, rotationSpeed: 0.2, orbitSpeed: 0.08, moons: [
        { name: 'Io', size: 0.2, distance: 2.8, orbitSpeed: 1.8, color: 'yellow' },
        { name: 'Europa', size: 0.18, distance: 3.5, orbitSpeed: 1.4, color: 'lightyellow' },
        { name: 'Ganymede', size: 0.25, distance: 4.2, orbitSpeed: 1.0, color: 'tan' },
        { name: 'Callisto', size: 0.22, distance: 5.0, orbitSpeed: 0.8, color: 'gray' },
    ]},
    { name: "Saturn", color: "khaki", size: 1.8, distance: 60, rotationSpeed: 0.15, orbitSpeed: 0.06, ring: { innerRadius: 2.2, outerRadius: 3.5, color: 'tan' } },
    { name: "Uranus", color: "lightblue", size: 1.2, distance: 75, rotationSpeed: 0.1, orbitSpeed: 0.04 },
    { name: "Neptune", color: "blue", size: 1.1, distance: 90, rotationSpeed: 0.1, orbitSpeed: 0.03 }
  ];

  const handlePlanetClick = (planetData, point) => {
    if (planetData.name === 'Earth' && point) {
      const localPoint = new THREE.Vector3().copy(point).normalize();
      const lat = 90 - (Math.acos(localPoint.y)) * 180 / Math.PI;
      const lon = ((270 + (Math.atan2(localPoint.x, localPoint.z)) * 180 / Math.PI) % 360) - 180;
      const utcOffset = lon / 15;
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const localTime = new Date(utc + (3600000 * utcOffset));
      const timeString = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }).format(localTime);
      setPanelData({ lat, lon, time: timeString, name: 'Earth' });
    } else {
      setPanelData(planetData);
    }
  };

  return (
    <div className="app-container">
      <InfoPanel data={panelData} onClose={() => setPanelData(null)} />
      <TimeControls setTimeScale={setTimeScale} timeScale={timeScale} />
      <Canvas camera={{ position: [0, 80, 120], fov: 60 }}>
        <ambientLight intensity={0.1} />
        <Stars radius={300} depth={50} count={10000} factor={7} saturation={0} fade speed={1} />
        
        <Sun ref={sunRef} />
        
        {planets.map(planet => (
          <Fragment key={planet.name}>
            <Planet planetData={planet} onClick={handlePlanetClick} timeScale={timeScale} />
            <Orbit distance={planet.distance} />
          </Fragment>
        ))}
        <AsteroidBelt />
        <OrbitControls />
        
        {sunRef.current && (
            <EffectComposer>
                <GodRays sun={sunRef.current} />
            </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}

export default App;
