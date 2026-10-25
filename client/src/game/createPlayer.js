import * as THREE from 'three';

const COLORS = [0x22d8f4, 0xc15cff, 0xff4d95, 0xffd45c];
export function createPlayer(scene, index) {
  const group = new THREE.Group();
  const color = COLORS[index % COLORS.length];
  const armor = new THREE.MeshStandardMaterial({ color: 0x18233b, metalness: 0.72, roughness: 0.25, emissive: color, emissiveIntensity: 0.25 });
  const glow = new THREE.MeshStandardMaterial({ color, metalness: 0.25, roughness: 0.25, emissive: color, emissiveIntensity: 1.3 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.52, 0.45, 4, 8), armor); torso.position.y = 0.86; group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), armor); head.position.y = 1.65; group.add(head);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.11, 0.12), glow); visor.position.set(0, 1.69, -0.25); group.add(visor);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), glow); core.position.set(0, 0.93, -0.48); group.add(core);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.035, 6, 28), glow); ring.rotation.x = Math.PI / 2; ring.position.y = 0.08; group.add(ring);
  const shield = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.025, 6, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 })); shield.rotation.x = Math.PI / 2; shield.position.y = 0.1; group.add(shield);
  scene.add(group);
  return { group, core, ring, shield, color };
}
