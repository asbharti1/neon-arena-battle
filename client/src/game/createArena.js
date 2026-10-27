import * as THREE from 'three';

export function createArena(scene) {
  // Arena floor: high contrast dark metallic disc
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(18, 96),
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.85,
      roughness: 0.3,
      emissive: 0x050d1e,
      emissiveIntensity: 0.35
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.05;
  scene.add(floor);

  // Vibrant cyber grid
  const grid = new THREE.GridHelper(36, 36, 0x00f5ff, 0x1e3a5f);
  grid.position.y = -0.02;
  grid.material.transparent = true;
  grid.material.opacity = 0.55;
  scene.add(grid);

  // Concentric neon floor rings
  const ringConfigs = [
    { radius: 4.5, width: 0.06, color: 0x00f5ff, opacity: 0.85 },
    { radius: 9.5, width: 0.05, color: 0xa855f7, opacity: 0.75 },
    { radius: 14.5, width: 0.06, color: 0x38bdf8, opacity: 0.8 },
    { radius: 17.5, width: 0.16, color: 0x00f5ff, opacity: 0.95 }
  ];
  for (const rc of ringConfigs) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(rc.radius, rc.width, 8, 128),
      new THREE.MeshBasicMaterial({ color: rc.color, transparent: true, opacity: rc.opacity })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.02;
    scene.add(ring);
  }

  // Outer boundary pillars and energy pylons
  for (let i = 0; i < 16; i += 1) {
    const a = (i / 16) * Math.PI * 2;
    const isPylon = i % 4 === 0;
    const pillarColor = isPylon ? 0xa855f7 : 0x00f5ff;

    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.32, 4.2, 8),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.8,
        roughness: 0.2,
        emissive: pillarColor,
        emissiveIntensity: 0.7
      })
    );
    pillar.position.set(Math.cos(a) * 17.6, 2.1, Math.sin(a) * 17.6);
    scene.add(pillar);

    // Glowing energy beacon on top
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 12, 10),
      new THREE.MeshBasicMaterial({ color: pillarColor })
    );
    beacon.position.set(pillar.position.x, 4.3, pillar.position.z);
    scene.add(beacon);

    const cap = new THREE.PointLight(pillarColor, 1.8, 7);
    cap.position.set(pillar.position.x, 4.3, pillar.position.z);
    scene.add(cap);
  }

  // Center combat platform
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(3.6, 3.8, 0.25, 8),
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0x0284c7,
      emissiveIntensity: 0.55
    })
  );
  pad.position.set(0, 0.1, 0);
  scene.add(pad);

  // Center holographic core ring
  const centerRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.4, 0.08, 8, 64),
    new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.9 })
  );
  centerRing.rotation.x = Math.PI / 2;
  centerRing.position.y = 0.26;
  scene.add(centerRing);

  // 4 Tactical cover barricades
  for (let i = 0; i < 4; i += 1) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const coverGroup = new THREE.Group();

    // Sturdy cover wall (height 1.7)
    const cover = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 1.7, 1.1),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.65,
        roughness: 0.35,
        emissive: 0x0369a1,
        emissiveIntensity: 0.5
      })
    );
    cover.position.set(0, 0.85, 0);
    coverGroup.add(cover);

    // Bright neon top visor
    const topStripe = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.08, 1.0),
      new THREE.MeshBasicMaterial({ color: 0x00f5ff })
    );
    topStripe.position.set(0, 1.72, 0);
    coverGroup.add(topStripe);

    // Lateral glowing energy insets
    const sideA = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.12, 1.14),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    sideA.position.set(0, 0.85, 0);
    coverGroup.add(sideA);

    coverGroup.position.set(Math.cos(a) * 8.5, 0, Math.sin(a) * 8.5);
    coverGroup.rotation.y = -a;
    scene.add(coverGroup);
  }

  // Vibrant, high-visibility lighting
  const ambient = new THREE.AmbientLight(0x93c5fd, 1.1);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 1.2);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 2.5);
  sun.position.set(-10, 24, 10);
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xc084fc, 1.4);
  fill.position.set(12, 18, -12);
  scene.add(fill);
}
