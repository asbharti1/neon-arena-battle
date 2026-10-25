import * as THREE from 'three';

export function createArena(scene) {
  const floor = new THREE.Mesh(new THREE.CircleGeometry(18, 96), new THREE.MeshStandardMaterial({ color: 0x0b1222, metalness: 0.78, roughness: 0.42 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.08; scene.add(floor);
  const grid = new THREE.GridHelper(36, 36, 0x1b6a82, 0x17263d); grid.position.y = -0.045; grid.material.transparent = true; grid.material.opacity = 0.42; scene.add(grid);
  for (const radius of [5, 10.5, 16.5]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, radius === 16.5 ? 0.1 : 0.035, 8, 128), new THREE.MeshBasicMaterial({ color: radius === 16.5 ? 0x21d6f3 : 0x6645ff, transparent: true, opacity: radius === 16.5 ? 0.78 : 0.55 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.015; scene.add(ring);
  }
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.28, 3.6, 6), new THREE.MeshStandardMaterial({ color: 0x17243a, metalness: 0.75, roughness: 0.26, emissive: i % 3 === 0 ? 0x6f24d8 : 0x063b52, emissiveIntensity: 0.65 }));
    pillar.position.set(Math.cos(a) * 17.3, 1.75, Math.sin(a) * 17.3); scene.add(pillar);
    const cap = new THREE.PointLight(i % 3 === 0 ? 0xc25cff : 0x19ddff, 1.4, 5); cap.position.set(pillar.position.x, 3.7, pillar.position.z); scene.add(cap);
  }
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0x151b30, metalness: 0.84, roughness: 0.24, emissive: 0x153464, emissiveIntensity: 0.5 }));
  pad.position.set(0, 0.08, 0); scene.add(pad);
  for (let i = 0; i < 4; i += 1) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const cover = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.15, 1.05), new THREE.MeshStandardMaterial({ color: 0x142039, metalness: 0.52, roughness: 0.4, emissive: 0x092b49, emissiveIntensity: 0.7 }));
    cover.position.set(Math.cos(a) * 8.5, 0.5, Math.sin(a) * 8.5); cover.rotation.y = -a; scene.add(cover);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2, 0.045, 1.1), new THREE.MeshBasicMaterial({ color: 0x21ddf5 })); stripe.position.set(cover.position.x, 1.09, cover.position.z); stripe.rotation.y = cover.rotation.y; scene.add(stripe);
  }
  const ambient = new THREE.HemisphereLight(0x9bbdff, 0x101225, 1.45); scene.add(ambient);
  const sun = new THREE.DirectionalLight(0x86b9ff, 2.0); sun.position.set(-7, 18, 6); scene.add(sun);
}
