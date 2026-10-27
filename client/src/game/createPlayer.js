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

  // Dark metallic cyber armor
  const armorMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.9,
    roughness: 0.2,
    emissive: color,
    emissiveIntensity: 0.35
  });

  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.1,
    emissive: color,
    emissiveIntensity: 2.8
  });

  const energyBladeMat = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.95
  });

  // ==========================================
  // 1. CYBER WARRIOR BODY & ARMOR
  // ==========================================
  // Torso / Athletic Cyber Frame
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 0.6, 6, 12), armorMat);
  torso.position.y = 1.0;
  group.add(torso);

  // Chest Armor Plate with glowing energy core
  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.5, 0.3), armorMat);
  chestPlate.position.set(0, 1.15, -0.4);
  group.add(chestPlate);

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), glowMat);
  core.position.set(0, 1.15, -0.52);
  group.add(core);

  // Shoulder Pauldrons
  for (const side of [-0.62, 0.62]) {
    const pauldron = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.4), armorMat);
    pauldron.position.set(side, 1.45, -0.05);
    group.add(pauldron);

    const pauldronGlow = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.42), glowMat);
    pauldronGlow.position.set(side, 1.52, -0.05);
    group.add(pauldronGlow);
  }

  // ==========================================
  // 2. CYBER NINJA HELMET & HORNS
  // ==========================================
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 12), armorMat);
  head.position.y = 1.82;
  group.add(head);

  // Angular Glowing Visor
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.14, 0.2), glowMat);
  visor.position.set(0, 1.85, -0.28);
  group.add(visor);

  // Cyber warrior sweeping helmet fins (like key art)
  for (const side of [-0.28, 0.28]) {
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.55, 4), armorMat);
    fin.position.set(side, 2.05, 0.12);
    fin.rotation.x = -Math.PI / 4;
    fin.rotation.z = side * 0.3;
    group.add(fin);
  }

  // Flowing Cyber Scarf / Energy Tail (like the blue scarf in key art)
  const scarf = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.08, 0.9),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 })
  );
  scarf.position.set(0, 1.62, 0.5);
  scarf.rotation.x = 0.3;
  group.add(scarf);

  // ==========================================
  // 3. CYBER BLADE / ENERGY SWORD
  // ==========================================
  const swordGroup = new THREE.Group();
  swordGroup.position.set(0.65, 1.0, -0.35);

  // Sword hilt
  const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.35, 8), armorMat);
  hilt.rotation.x = Math.PI / 2;
  swordGroup.add(hilt);

  // Luminous double-edged energy blade (key art weapon)
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 1.25), energyBladeMat);
  blade.position.set(0, 0, -0.75);
  swordGroup.add(blade);

  // Inner white hot blade core
  const bladeCore = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.03, 1.15),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  bladeCore.position.set(0, 0, -0.75);
  swordGroup.add(bladeCore);

  group.add(swordGroup);

  // ==========================================
  // 4. HOVER HALO & GROUND CONDUIT
  // ==========================================
  const groundDisc = new THREE.Mesh(
    new THREE.CircleGeometry(1.05, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 })
  );
  groundDisc.rotation.x = -Math.PI / 2;
  groundDisc.position.y = 0.03;
  group.add(groundDisc);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.06, 8, 36), glowMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.05;
  group.add(ring);

  // Invulnerability spawn shield bubble
  const shield = new THREE.Mesh(
    new THREE.SphereGeometry(1.5, 24, 18),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, wireframe: true })
  );
  shield.position.y = 1.1;
  shield.visible = false;
  group.add(shield);

  // ==========================================
  // 5. BILLBOARD OVERHEAD NAMEPLATE & HP BAR
  // ==========================================
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 72;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;

  const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const nameplate = new THREE.Sprite(spriteMat);
  nameplate.scale.set(3.0, 0.85, 1);
  nameplate.position.set(0, 2.9, 0);
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

    // High contrast backdrop
    ctx.fillStyle = 'rgba(7, 12, 24, 0.92)';
    ctx.beginPath();
    ctx.roundRect(8, 4, 240, 64, 10);
    ctx.fill();

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = isSelf ? '#00f5ff' : hex;
    ctx.stroke();

    // Pilot name
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isSelf ? '#38bdf8' : '#ffffff';
    const label = isSelf ? `▼ YOU (${name || 'PILOT'})` : (name || 'PILOT');
    ctx.fillText(label, 128, 24);

    // Health track
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.beginPath();
    ctx.roundRect(20, 44, 216, 12, 6);
    ctx.fill();

    // Health fill
    const fillWidth = Math.max(0, Math.min(216, (hp / 100) * 216));
    ctx.fillStyle = hp > 50 ? (isSelf ? '#22d3ee' : hex) : hp > 25 ? '#f59e0b' : '#ef4444';
    ctx.beginPath();
    ctx.roundRect(20, 44, fillWidth, 12, 6);
    ctx.fill();

    texture.needsUpdate = true;
  }

  updateNameplate('PILOT', false, 100);

  scene.add(group);
  return { group, core, ring, shield, scarf, swordGroup, color, hex, updateNameplate };
}
