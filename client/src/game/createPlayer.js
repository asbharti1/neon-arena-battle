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
    color: 0x0c1322,
    metalness: 0.92,
    roughness: 0.22,
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

  // Inner body group that tilts when moving/banking
  const innerBody = new THREE.Group();
  group.add(innerBody);

  // ==========================================
  // 1. CYBER WARRIOR BODY & ARMOR
  // ==========================================
  // Torso / Athletic Cyber Frame
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 0.62, 6, 12), armorMat);
  torso.position.y = 1.05;
  innerBody.add(torso);

  // Chest Armor Plate with glowing energy core
  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.52, 0.32), armorMat);
  chestPlate.position.set(0, 1.18, -0.4);
  innerBody.add(chestPlate);

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), glowMat);
  core.position.set(0, 1.18, -0.52);
  innerBody.add(core);

  // Shoulder Pauldrons
  for (const side of [-0.62, 0.62]) {
    const pauldron = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.42), armorMat);
    pauldron.position.set(side, 1.48, -0.05);
    innerBody.add(pauldron);

    const pauldronGlow = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.44), glowMat);
    pauldronGlow.position.set(side, 1.55, -0.05);
    innerBody.add(pauldronGlow);
  }

  // ==========================================
  // 2. CYBER NINJA HELMET & HORNS
  // ==========================================
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 14, 12), armorMat);
  head.position.y = 1.84;
  innerBody.add(head);

  // Angular Glowing Visor
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.15, 0.22), glowMat);
  visor.position.set(0, 1.86, -0.28);
  innerBody.add(visor);

  // Sweeping helmet fins
  for (const side of [-0.28, 0.28]) {
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.58, 4), armorMat);
    fin.position.set(side, 2.08, 0.12);
    fin.rotation.x = -Math.PI / 4;
    fin.rotation.z = side * 0.3;
    innerBody.add(fin);
  }

  // Flowing Cyber Scarf / Energy Tail
  const scarf = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.08, 0.95),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 })
  );
  scarf.position.set(0, 1.64, 0.52);
  scarf.rotation.x = 0.3;
  innerBody.add(scarf);

  // ==========================================
  // 3. CYBER BLADE / ENERGY SWORD
  // ==========================================
  const swordGroup = new THREE.Group();
  swordGroup.position.set(0.65, 1.05, -0.35);

  const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.35, 8), armorMat);
  hilt.rotation.x = Math.PI / 2;
  swordGroup.add(hilt);

  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 1.3), energyBladeMat);
  blade.position.set(0, 0, -0.78);
  swordGroup.add(blade);

  const bladeCore = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.03, 1.2),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  bladeCore.position.set(0, 0, -0.78);
  swordGroup.add(bladeCore);

  innerBody.add(swordGroup);

  // ==========================================
  // 4. THRUSTER JETS & CONTACT SHADOW
  // ==========================================
  // Ground contact shadow (soft ambient dark disc)
  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(1.15, 32),
    new THREE.MeshBasicMaterial({ color: 0x02050b, transparent: true, opacity: 0.65 })
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.02;
  group.add(shadowDisc);

  // Ground energy conduit ring
  const groundDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 })
  );
  groundDisc.rotation.x = -Math.PI / 2;
  groundDisc.position.y = 0.03;
  group.add(groundDisc);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.05, 8, 36), glowMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.04;
  group.add(ring);

  // Dual Repulsor Thruster Cones at feet
  const thrusters = [];
  for (const side of [-0.32, 0.32]) {
    const thruster = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.04, 0.45, 8, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    thruster.position.set(side, 0.35, 0);
    innerBody.add(thruster);
    thrusters.push(thruster);
  }

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
  nameplate.position.set(0, 2.95, 0);
  group.add(nameplate);

  let lastHp = -1;
  let lastName = '';
  let lastIsSelf = null;
  let hitFlashTimer = 0;

  function updateNameplate(name, isSelf, hp) {
    if (name === lastName && isSelf === lastIsSelf && hp === lastHp) return;
    lastName = name;
    lastIsSelf = isSelf;
    lastHp = hp;

    ctx.clearRect(0, 0, 256, 72);

    // High contrast backdrop with cyber corner trims
    ctx.fillStyle = 'rgba(7, 12, 24, 0.94)';
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

  function triggerHitFlash() {
    hitFlashTimer = 0.18;
  }

  function updateVisuals(delta, isMoving, vx, vz) {
    if (hitFlashTimer > 0) {
      hitFlashTimer -= delta;
      armorMat.emissive.setHex(0xffffff);
      armorMat.emissiveIntensity = 2.2;
    } else {
      armorMat.emissive.setHex(color);
      armorMat.emissiveIntensity = 0.35;
    }

    // Dynamic banking & tilt based on velocity
    if (isMoving) {
      const targetRoll = -vx * 0.18;
      const targetPitch = vz * 0.14;
      innerBody.rotation.z += (targetRoll - innerBody.rotation.z) * 0.2;
      innerBody.rotation.x += (targetPitch - innerBody.rotation.x) * 0.2;
    } else {
      innerBody.rotation.z *= 0.85;
      innerBody.rotation.x *= 0.85;
    }

    // Thruster flicker
    for (const thruster of thrusters) {
      thruster.scale.y = 0.8 + Math.random() * 0.4;
    }
  }

  updateNameplate('PILOT', false, 100);
  scene.add(group);

  return {
    group,
    innerBody,
    core,
    ring,
    shield,
    scarf,
    swordGroup,
    color,
    hex,
    updateNameplate,
    triggerHitFlash,
    updateVisuals
  };
}
