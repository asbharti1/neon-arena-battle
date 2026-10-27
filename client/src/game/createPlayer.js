import * as THREE from 'three';

const PALETTES = [
  { color: 0x00f5ff, hex: '#00f5ff', name: 'CYAN' },
  { color: 0xf43f5e, hex: '#f43f5e', name: 'ROSE' },
  { color: 0xfbbf24, hex: '#fbbf24', name: 'AMBER' },
  { color: 0x10b981, hex: '#10b981', name: 'EMERALD' }
];

export function createPlayer(scene, index) {
  const group = new THREE.Group();
  const palette = PALETTES[index % PALETTES.length];
  const color = palette.color;
  const hex = palette.hex;

  // Modern metallic armor with glowing accent trim
  const armorMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.8,
    roughness: 0.25,
    emissive: color,
    emissiveIntensity: 0.4
  });

  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.2,
    emissive: color,
    emissiveIntensity: 2.5
  });

  // Torso / Body (slightly larger for clear visibility)
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.58, 0.55, 6, 12), armorMat);
  torso.position.y = 0.95;
  group.add(torso);

  // Chest Armor Plate with glowing neon emblem
  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 0.25), armorMat);
  chestPlate.position.set(0, 1.05, -0.42);
  group.add(chestPlate);

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), glowMat);
  core.position.set(0, 1.05, -0.52);
  group.add(core);

  // Head and Visor
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 12), armorMat);
  head.position.y = 1.78;
  group.add(head);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.14, 0.18), glowMat);
  visor.position.set(0, 1.82, -0.28);
  group.add(visor);

  // Arm Blaster / Cannon (shows aiming direction clearly)
  const blaster = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.7), armorMat);
  blaster.position.set(0.52, 1.05, -0.45);
  group.add(blaster);

  const blasterMuzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 8), glowMat);
  blasterMuzzle.rotation.x = Math.PI / 2;
  blasterMuzzle.position.set(0.52, 1.05, -0.82);
  group.add(blasterMuzzle);

  // Ground hover halo: glowing disc + rotating outer ring
  const groundDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 })
  );
  groundDisc.rotation.x = -Math.PI / 2;
  groundDisc.position.y = 0.04;
  group.add(groundDisc);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.05, 8, 36), glowMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  group.add(ring);

  // Invulnerability spawn shield bubble
  const shield = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 20, 16),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, wireframe: true })
  );
  shield.position.y = 1.1;
  shield.visible = false;
  group.add(shield);

  // Dynamic 2D Billboard Overhead Nameplate & Health Bar
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 72;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;

  const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const nameplate = new THREE.Sprite(spriteMat);
  nameplate.scale.set(2.8, 0.8, 1);
  nameplate.position.set(0, 2.7, 0);
  group.add(nameplate);

  let lastHp = -1;
  let lastName = '';
  let lastIsSelf = null;

  function updateNameplate(name, isSelf, hp) {
    if (name === lastName && isSelf === lastIsSelf && hp === lastHp) return;
    lastName = name;
    lastIsSelf = isSelf;
    lastHp = hp;

    ctx.clearRect(0, 0, 256, 72);

    // Background badge
    ctx.fillStyle = 'rgba(10, 15, 29, 0.88)';
    ctx.beginPath();
    ctx.roundRect(8, 4, 240, 64, 10);
    ctx.fill();

    // Border
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = isSelf ? '#00f5ff' : hex;
    ctx.stroke();

    // Title / Name
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isSelf ? '#38bdf8' : '#ffffff';
    const label = isSelf ? `▼ YOU (${name || 'PILOT'})` : (name || 'PILOT');
    ctx.fillText(label, 128, 24);

    // Health bar background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.beginPath();
    ctx.roundRect(20, 44, 216, 12, 6);
    ctx.fill();

    // Health bar fill
    const fillWidth = Math.max(0, Math.min(216, (hp / 100) * 216));
    ctx.fillStyle = hp > 50 ? (isSelf ? '#22d3ee' : hex) : hp > 25 ? '#f59e0b' : '#ef4444';
    ctx.beginPath();
    ctx.roundRect(20, 44, fillWidth, 12, 6);
    ctx.fill();

    texture.needsUpdate = true;
  }

  // Initial draw
  updateNameplate('PILOT', false, 100);

  scene.add(group);
  return { group, core, ring, shield, color, hex, updateNameplate };
}
