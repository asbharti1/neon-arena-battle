import * as THREE from 'three';

export function createArena(scene) {
  const animatedObjects = [];

  // ==========================================
  // 1. SKYLINE & BACKGROUND MONOLITHS
  // ==========================================
  const buildingMat = new THREE.MeshStandardMaterial({
    color: 0x070c18,
    metalness: 0.9,
    roughness: 0.35,
    emissive: 0x020712
  });

  const neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
  const neonPurpleMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });

  // Ring of towering cyber skyscrapers / monoliths in the far distance
  const numBuildings = 28;
  const skylineRadius = 38;

  for (let i = 0; i < numBuildings; i++) {
    const angle = (i / numBuildings) * Math.PI * 2 + (Math.random() * 0.1 - 0.05);
    const height = 18 + (i % 5) * 8 + Math.random() * 6;
    const width = 3 + (i % 3) * 1.5;
    const depth = 3 + (i % 4) * 1.2;

    const building = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), buildingMat);
    const x = Math.cos(angle) * (skylineRadius + (i % 3) * 6);
    const z = Math.sin(angle) * (skylineRadius + (i % 3) * 6);
    building.position.set(x, height / 2 - 2, z);
    building.rotation.y = -angle + Math.PI / 2;
    scene.add(building);

    // Vertical neon light strips on building facades
    const stripColor = i % 2 === 0 ? neonCyanMat : neonPurpleMat;
    const stripHeight = height * 0.7;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.15, stripHeight, depth + 0.1), stripColor);
    strip.position.set(x, stripHeight / 2 + 2, z);
    strip.rotation.y = building.rotation.y;
    scene.add(strip);
  }

  // Floating sci-fi monoliths / sky structures
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + 0.3;
    const dist = 28 + (i % 2) * 5;
    const floatHeight = 14 + (i % 3) * 4;
    const monolith = new THREE.Mesh(new THREE.ConeGeometry(1.8, 7, 5), buildingMat);
    monolith.position.set(Math.cos(angle) * dist, floatHeight, Math.sin(angle) * dist);
    monolith.rotation.z = Math.PI; // upside down floating spire
    scene.add(monolith);

    // Glowing core in monolith
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 6, 8), neonCyanMat);
    core.position.copy(monolith.position);
    scene.add(core);

    animatedObjects.push({
      update: (time) => {
        monolith.position.y = floatHeight + Math.sin(time * 0.8 + i) * 0.6;
        core.position.y = monolith.position.y;
      }
    });
  }

  // ==========================================
  // 2. CELESTIAL SKY RING & ENERGY CONDUIT
  // ==========================================
  // Giant segmented orbital halo hovering above
  const skyRingGroup = new THREE.Group();
  skyRingGroup.position.set(0, 24, 0);

  const mainRing = new THREE.Mesh(
    new THREE.TorusGeometry(13, 0.45, 12, 64),
    new THREE.MeshStandardMaterial({
      color: 0x111a2e,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x00f5ff,
      emissiveIntensity: 0.6
    })
  );
  mainRing.rotation.x = Math.PI / 2;
  skyRingGroup.add(mainRing);

  // Outer segmented ring sections
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const segment = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 0.7, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.2, emissive: 0x38bdf8, emissiveIntensity: 0.5 })
    );
    segment.position.set(Math.cos(a) * 14.5, 0, Math.sin(a) * 14.5);
    segment.rotation.y = -a;
    skyRingGroup.add(segment);
  }
  scene.add(skyRingGroup);

  animatedObjects.push({
    update: (time) => {
      skyRingGroup.rotation.y = time * 0.15;
    }
  });

  // Vertical sky energy beam shooting from center to sky ring
  const beamGeo = new THREE.CylinderGeometry(0.55, 0.95, 26, 24, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x00f5ff,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.set(0, 13, 0);
  scene.add(beam);

  // Inner concentrated beam core
  const beamCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.25, 26, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
  );
  beamCore.position.set(0, 13, 0);
  scene.add(beamCore);

  animatedObjects.push({
    update: (time) => {
      const pulse = 0.4 + Math.sin(time * 3.5) * 0.12;
      beamMat.opacity = pulse;
      beam.rotation.y = -time * 0.4;
    }
  });

  // ==========================================
  // 3. ARENA GROUND & CIRCUIT FLOORING
  // ==========================================
  // Wet reflective dark metallic arena floor
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(19, 96),
    new THREE.MeshStandardMaterial({
      color: 0x080e1a,
      metalness: 0.95,
      roughness: 0.2,
      emissive: 0x020714,
      emissiveIntensity: 0.4
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.05;
  scene.add(floor);

  // Radial circuit lines branching across floor
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const isMajor = i % 3 === 0;
    const lineLen = isMajor ? 17.5 : 12;
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(0.14, lineLen),
      new THREE.MeshBasicMaterial({
        color: isMajor ? 0x00f5ff : 0x7c3aed,
        transparent: true,
        opacity: isMajor ? 0.9 : 0.65
      })
    );
    line.rotation.x = -Math.PI / 2;
    line.rotation.z = -a;
    line.position.set(Math.cos(a) * (lineLen / 2 + 1.8), 0.01, Math.sin(a) * (lineLen / 2 + 1.8));
    scene.add(line);
  }

  // Concentric neon rings on the floor
  const ringConfigs = [
    { r: 2.5, w: 0.08, c: 0x00f5ff, op: 0.95 },
    { r: 5.5, w: 0.06, c: 0x38bdf8, op: 0.75 },
    { r: 10.5, w: 0.07, c: 0x8b5cf6, op: 0.7 },
    { r: 15.0, w: 0.08, c: 0x00f5ff, op: 0.85 },
    { r: 18.2, w: 0.25, c: 0x00f5ff, op: 1.0 }
  ];
  for (const rc of ringConfigs) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(rc.r, rc.r + rc.w, 96),
      new THREE.MeshBasicMaterial({ color: rc.c, transparent: true, opacity: rc.op, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    scene.add(ring);
  }

  // Center glowing energy altar
  const altar = new THREE.Mesh(
    new THREE.CylinderGeometry(2.0, 2.4, 0.4, 8),
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x00f5ff,
      emissiveIntensity: 0.9
    })
  );
  altar.position.set(0, 0.2, 0);
  scene.add(altar);

  // Outer boundary energy pylons with laser barriers
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const isKeyPylon = i % 4 === 0;
    const pylonColor = isKeyPylon ? 0xa855f7 : 0x00f5ff;

    const pylon = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 4.5, 0.5),
      new THREE.MeshStandardMaterial({
        color: 0x111827,
        metalness: 0.85,
        roughness: 0.25,
        emissive: pylonColor,
        emissiveIntensity: 0.75
      })
    );
    pylon.position.set(Math.cos(a) * 18.2, 2.25, Math.sin(a) * 18.2);
    pylon.rotation.y = -a;
    scene.add(pylon);

    // Glowing tip
    const tip = new THREE.PointLight(pylonColor, 1.6, 6);
    tip.position.set(pylon.position.x, 4.6, pylon.position.z);
    scene.add(tip);
  }

  // ==========================================
  // 4. SCI-FI COVER BARRICADES
  // ==========================================
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const barricadeGroup = new THREE.Group();

    // Heavy cyber wall
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 1.8, 1.1),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.8,
        roughness: 0.3,
        emissive: 0x0284c7,
        emissiveIntensity: 0.4
      })
    );
    wall.position.set(0, 0.9, 0);
    barricadeGroup.add(wall);

    // Glowing holographic top crest
    const topBar = new THREE.Mesh(
      new THREE.BoxGeometry(2.9, 0.1, 1.15),
      new THREE.MeshBasicMaterial({ color: 0x00f5ff })
    );
    topBar.position.set(0, 1.82, 0);
    barricadeGroup.add(topBar);

    // Glowing vertical chevron side lights
    for (const offset of [-1.2, 0, 1.2]) {
      const chevron = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 1.2, 1.16),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      chevron.position.set(offset, 0.9, 0);
      barricadeGroup.add(chevron);
    }

    barricadeGroup.position.set(Math.cos(a) * 8.5, 0, Math.sin(a) * 8.5);
    barricadeGroup.rotation.y = -a;
    scene.add(barricadeGroup);
  }

  // ==========================================
  // 5. FLOATING CYBER PARTICLES / EMBER DUST
  // ==========================================
  const particleCount = 180;
  const particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  const particleSpeeds = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    const r = Math.random() * 18;
    const th = Math.random() * Math.PI * 2;
    particlePositions[i * 3] = Math.cos(th) * r;
    particlePositions[i * 3 + 1] = Math.random() * 10;
    particlePositions[i * 3 + 2] = Math.sin(th) * r;
    particleSpeeds[i] = 0.5 + Math.random() * 0.8;
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

  const particleMat = new THREE.PointsMaterial({
    color: 0x00f5ff,
    size: 0.18,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  animatedObjects.push({
    update: (time, delta) => {
      const positions = particleGeo.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 1] += particleSpeeds[i] * delta * 0.8;
        if (positions[i * 3 + 1] > 11) {
          positions[i * 3 + 1] = 0.1;
        }
      }
      particleGeo.attributes.position.needsUpdate = true;
    }
  });

  // ==========================================
  // 6. CINEMATIC LIGHTING
  // ==========================================
  const ambient = new THREE.AmbientLight(0x38bdf8, 0.9);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xdbeafe, 2.6);
  keyLight.position.set(-14, 28, 14);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xa855f7, 2.0);
  rimLight.position.set(16, 20, -16);
  scene.add(rimLight);

  const centerPillarLight = new THREE.PointLight(0x00f5ff, 3.5, 20);
  centerPillarLight.position.set(0, 4, 0);
  scene.add(centerPillarLight);

  return { animatedObjects };
}
