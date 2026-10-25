import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createArena } from './createArena.js';
import { createPlayer } from './createPlayer.js';

export default function ArenaCanvas({ state, selfId, inputRef }) {
  const mount = useRef(null); const latest = useRef({ state, selfId });
  useEffect(() => { latest.current = { state, selfId }; }, [state, selfId]);
  useEffect(() => {
    const element = mount.current; if (!element) return undefined;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x070a13); scene.fog = new THREE.FogExp2(0x070a13, 0.024);
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100); camera.position.set(0, 26, 28); camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' }); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace; element.appendChild(renderer.domElement);
    createArena(scene);
    const actors = new Map(); const shots = new Map();
    const resize = () => { const w = Math.max(1, element.clientWidth); const h = Math.max(1, element.clientHeight); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h, false); };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    const raycaster = new THREE.Raycaster(); const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const getAim = (clientX, clientY) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const pointer = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera); const point = new THREE.Vector3(); raycaster.ray.intersectPlane(floorPlane, point);
      const me = latest.current.state?.players?.find((p) => p.id === latest.current.selfId);
      const dx = point.x - (me?.x || 0); const dz = point.z - (me?.z || 0); const length = Math.hypot(dx, dz) || 1;
      if (inputRef.current) { inputRef.current.aimX = dx / length; inputRef.current.aimZ = dz / length; }
    };
    const aimMouse = (event) => getAim(event.clientX, event.clientY);
    const aimTouch = (event) => { const touch = event.touches?.[0] || event.changedTouches?.[0]; if (touch) getAim(touch.clientX, touch.clientY); };
    renderer.domElement.addEventListener('pointermove', aimMouse); renderer.domElement.addEventListener('touchstart', aimTouch, { passive: true }); renderer.domElement.addEventListener('touchmove', aimTouch, { passive: true });
    let frame; let time = 0;
    const draw = () => {
      frame = requestAnimationFrame(draw); time += 0.016;
      const current = latest.current; const roster = current.state?.players || []; const keep = new Set(roster.map((p) => p.id));
      roster.forEach((player, index) => {
        let actor = actors.get(player.id); if (!actor) { actor = { ...createPlayer(scene, index), target: new THREE.Vector3() }; actors.set(player.id, actor); }
        actor.target.set(player.x || 0, 0, player.z || 0); actor.group.position.lerp(actor.target, 0.28); actor.group.rotation.y = Math.atan2(player.aimX || 0, player.aimZ || -1); actor.group.visible = player.alive;
        actor.core.material.emissiveIntensity = player.id === current.selfId ? 1.65 : 1.05;
        actor.ring.rotation.z = time * (player.id === current.selfId ? 0.7 : -0.5); actor.shield.visible = Date.now() < (player.protectedUntil || 0);
        if (player.id === current.selfId) { const target = new THREE.Vector3(player.x * 0.24, 26, 28 + player.z * 0.24); camera.position.lerp(target, 0.045); camera.lookAt(player.x * 0.22, 0, player.z * 0.22); }
      });
      for (const [id, actor] of actors) if (!keep.has(id)) { scene.remove(actor.group); actors.delete(id); }
      const projectiles = current.state?.projectiles || []; const keepShots = new Set(projectiles.map((p) => p.id));
      for (const shot of projectiles) {
        let shotNode = shots.get(shot.id); if (!shotNode) { const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.23, 8, 6), new THREE.MeshBasicMaterial({ color: 0x87f9ff })); scene.add(mesh); shotNode = { mesh, target: new THREE.Vector3() }; shots.set(shot.id, shotNode); }
        shotNode.target.set(shot.x, 0.76, shot.z); shotNode.mesh.position.lerp(shotNode.target, 0.7);
      }
      for (const [id, shotNode] of shots) if (!keepShots.has(id)) { scene.remove(shotNode.mesh); shotNode.mesh.geometry.dispose(); shotNode.mesh.material.dispose(); shots.delete(id); }
      renderer.render(scene, camera);
    };
    draw();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); renderer.domElement.removeEventListener('pointermove', aimMouse); renderer.domElement.removeEventListener('touchstart', aimTouch); renderer.domElement.removeEventListener('touchmove', aimTouch); renderer.dispose(); scene.traverse((obj) => { if (obj.geometry) obj.geometry.dispose(); if (obj.material) (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) => m.dispose()); }); element.replaceChildren(); };
  }, [inputRef]);
  return <div className="arena-canvas" ref={mount} aria-label="Three-dimensional neon combat arena" />;
}
