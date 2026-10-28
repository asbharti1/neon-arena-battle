import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createArena } from './createArena.js';
import { createPlayer } from './createPlayer.js';

export default function ArenaCanvas({ state, selfId, inputRef }) {
  const mount = useRef(null);
  const latest = useRef({ state, selfId });

  useEffect(() => {
    latest.current = { state, selfId };
  }, [state, selfId]);

  useEffect(() => {
    const element = mount.current;
    if (!element) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060b17);
    scene.fog = new THREE.Fog(0x060b17, 34, 90);

    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 150);
    camera.position.set(0, 17, 21);
    camera.lookAt(0, 0.6, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    element.appendChild(renderer.domElement);

    const { animatedObjects } = createArena(scene);

    const actors = new Map();
    const shots = new Map();
    const prevHps = new Map();

    // Aim Laser Guideline & Target Reticle
    const aimPoints = [new THREE.Vector3(0, 0.15, 0), new THREE.Vector3(0, 0.15, -7.5)];
    const aimGeo = new THREE.BufferGeometry().setFromPoints(aimPoints);
    const aimMat = new THREE.LineDashedMaterial({
      color: 0x00f5ff,
      dashSize: 0.45,
      gapSize: 0.2,
      transparent: true,
      opacity: 0.9,
      linewidth: 2
    });
    const aimLine = new THREE.Line(aimGeo, aimMat);
    aimLine.computeLineDistances();
    scene.add(aimLine);

    // Aim Reticle on floor
    const reticleMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.85 });
    const reticleRing = new THREE.Mesh(new THREE.RingGeometry(0.38, 0.48, 28), reticleMat);
    reticleRing.rotation.x = -Math.PI / 2;
    reticleRing.position.y = 0.12;
    scene.add(reticleRing);

    // ==========================================
    // FLOATING COMBAT TEXT & SPARK PARTICLES
    // ==========================================
    const floatingTexts = [];
    const sparkParticles = [];

    const sparkGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const sparkMatCyan = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
    const sparkMatRose = new THREE.MeshBasicMaterial({ color: 0xf43f5e });

    function spawnSparks(x, y, z, isSelf) {
      const mat = isSelf ? sparkMatRose : sparkMatCyan;
      for (let i = 0; i < 16; i++) {
        const mesh = new THREE.Mesh(sparkGeo, mat);
        mesh.position.set(x, y, z);
        const theta = Math.random() * Math.PI * 2;
        const speed = 2.5 + Math.random() * 4.5;
        const vx = Math.cos(theta) * speed;
        const vz = Math.sin(theta) * speed;
        const vy = 1.5 + Math.random() * 3.5;
        scene.add(mesh);
        sparkParticles.push({ mesh, vx, vy, vz, life: 0.45, maxLife: 0.45 });
      }
    }

    function spawnCombatText(text, x, y, z, color = '#00f5ff') {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 48;
      const ctx = canvas.getContext('2d');
      ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.fillText(text, 80, 24);

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 1, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(2.0, 0.6, 1);
      sprite.position.set(x, y + 2.2, z);
      scene.add(sprite);

      floatingTexts.push({ sprite, texture, vy: 1.8, life: 0.75, maxLife: 0.75 });
    }

    let cameraShake = 0;

    const resize = () => {
      const w = Math.max(1, element.clientWidth);
      const h = Math.max(1, element.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();

    const raycaster = new THREE.Raycaster();
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    const getAim = (clientX, clientY) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const pointer = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(pointer, camera);
      const point = new THREE.Vector3();
      raycaster.ray.intersectPlane(floorPlane, point);

      const me = latest.current.state?.players?.find((p) => p.id === latest.current.selfId);
      const dx = point.x - (me?.x || 0);
      const dz = point.z - (me?.z || 0);
      const length = Math.hypot(dx, dz) || 1;

      if (inputRef.current) {
        inputRef.current.aimX = dx / length;
        inputRef.current.aimZ = dz / length;
      }
    };

    const aimMouse = (event) => getAim(event.clientX, event.clientY);
    const aimTouch = (event) => {
      const touch = event.touches?.[0] || event.changedTouches?.[0];
      if (touch) getAim(touch.clientX, touch.clientY);
    };

    renderer.domElement.addEventListener('pointermove', aimMouse);
    renderer.domElement.addEventListener('touchstart', aimTouch, { passive: true });
    renderer.domElement.addEventListener('touchmove', aimTouch, { passive: true });

    let frame;
    let time = 0;
    let prevTimestamp = performance.now();

    const draw = (nowTimestamp) => {
      frame = requestAnimationFrame(draw);
      const delta = Math.min(0.05, (nowTimestamp - prevTimestamp) / 1000) || 0.016;
      prevTimestamp = nowTimestamp;
      time += delta;

      // Animate arena background elements
      if (animatedObjects) {
        for (const obj of animatedObjects) {
          obj.update(time, delta);
        }
      }

      const current = latest.current;
      const roster = current.state?.players || [];
      const keep = new Set(roster.map((p) => p.id));
      let localPlayer = null;

      roster.forEach((player, index) => {
        let actor = actors.get(player.id);
        if (!actor) {
          actor = { ...createPlayer(scene, index), target: new THREE.Vector3(), prevX: player.x || 0, prevZ: player.z || 0 };
          actors.set(player.id, actor);
          prevHps.set(player.id, player.hp ?? 100);
        }

        const isSelf = player.id === current.selfId;
        if (isSelf) localPlayer = player;

        // Detect damage taken for sparks, flash, and floating combat text
        const prevHp = prevHps.get(player.id) ?? (player.hp ?? 100);
        if (player.hp < prevHp) {
          const dmg = prevHp - player.hp;
          actor.triggerHitFlash();
          spawnSparks(player.x, 1.2, player.z, isSelf);
          spawnCombatText(`-${dmg}`, player.x, 1.4, player.z, isSelf ? '#f43f5e' : '#38bdf8');
          if (isSelf) {
            cameraShake = 0.32;
          }
        }
        prevHps.set(player.id, player.hp ?? 100);

        actor.target.set(player.x || 0, 0, player.z || 0);
        const vx = (actor.target.x - actor.group.position.x) / 0.32;
        const vz = (actor.target.z - actor.group.position.z) / 0.32;
        const isMoving = Math.hypot(vx, vz) > 0.4;

        actor.group.position.lerp(actor.target, 0.35);
        actor.group.rotation.y = Math.atan2(player.aimX || 0, player.aimZ || -1);
        actor.group.visible = player.alive;

        // Animate cyber scarf and blade idle
        if (actor.scarf) {
          actor.scarf.rotation.y = Math.sin(time * 5 + index) * 0.18;
          actor.scarf.rotation.z = Math.cos(time * 4 + index) * 0.1;
        }
        if (actor.swordGroup) {
          actor.swordGroup.rotation.x = Math.sin(time * 3 + index) * 0.08;
        }

        actor.core.material.emissiveIntensity = isSelf ? 2.9 : 1.8;
        actor.ring.rotation.z = time * (isSelf ? 1.3 : -0.8);
        actor.shield.visible = Date.now() < (player.protectedUntil || 0);
        if (actor.shield.visible) {
          actor.shield.rotation.y = time * 2.2;
        }

        // Dynamic tilt, thrusters, and hit flash
        actor.updateVisuals(delta, isMoving, vx, vz);

        // Overhead nameplate & health
        actor.updateNameplate(player.name, isSelf, player.hp ?? 100);
      });

      // Smooth camera tracking centered on local player with screen shake
      if (localPlayer) {
        const targetX = localPlayer.x * 0.42;
        const targetZ = 20.5 + localPlayer.z * 0.42;
        camera.position.x += (targetX - camera.position.x) * 0.07;
        camera.position.y += (17 - camera.position.y) * 0.07;
        camera.position.z += (targetZ - camera.position.z) * 0.07;

        if (cameraShake > 0.005) {
          camera.position.x += (Math.random() - 0.5) * cameraShake;
          camera.position.y += (Math.random() - 0.5) * cameraShake * 0.5;
          cameraShake *= 0.88;
        }

        camera.lookAt(localPlayer.x * 0.32, 0.7, localPlayer.z * 0.32);

        // Update Aim Laser line
        const startX = localPlayer.x;
        const startZ = localPlayer.z;
        const aimX = localPlayer.aimX || 0;
        const aimZ = localPlayer.aimZ || -1;
        const lineLen = 7.5;
        const endX = startX + aimX * lineLen;
        const endZ = startZ + aimZ * lineLen;

        const positions = aimGeo.attributes.position.array;
        positions[0] = startX;
        positions[1] = 0.15;
        positions[2] = startZ;
        positions[3] = endX;
        positions[4] = 0.15;
        positions[5] = endZ;
        aimGeo.attributes.position.needsUpdate = true;
        aimLine.computeLineDistances();
        aimLine.visible = localPlayer.alive;

        // Update reticle
        reticleRing.position.set(endX, 0.12, endZ);
        reticleRing.visible = localPlayer.alive;
      } else {
        aimLine.visible = false;
        reticleRing.visible = false;
      }

      // Cleanup departed players
      for (const [id, actor] of actors) {
        if (!keep.has(id)) {
          scene.remove(actor.group);
          actors.delete(id);
          prevHps.delete(id);
        }
      }

      // Render glowing cyber energy projectiles
      const projectiles = current.state?.projectiles || [];
      const keepShots = new Set(projectiles.map((p) => p.id));

      for (const shot of projectiles) {
        let shotNode = shots.get(shot.id);
        if (!shotNode) {
          const shotGroup = new THREE.Group();

          // White core
          const core = new THREE.Mesh(
            new THREE.SphereGeometry(0.32, 10, 8),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
          );
          shotGroup.add(core);

          // Glowing energy halo
          const halo = new THREE.Mesh(
            new THREE.SphereGeometry(0.58, 10, 8),
            new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
          );
          shotGroup.add(halo);

          // Ground glow disc
          const shadow = new THREE.Mesh(
            new THREE.CircleGeometry(0.5, 16),
            new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.45 })
          );
          shadow.rotation.x = -Math.PI / 2;
          shadow.position.y = -0.7;
          shotGroup.add(shadow);

          scene.add(shotGroup);
          shotNode = { group: shotGroup, target: new THREE.Vector3() };
          shots.set(shot.id, shotNode);
        }

        shotNode.target.set(shot.x, 0.85, shot.z);
        shotNode.group.position.lerp(shotNode.target, 0.75);
      }

      for (const [id, shotNode] of shots) {
        if (!keepShots.has(id)) {
          scene.remove(shotNode.group);
          shots.delete(id);
        }
      }

      // Update spark particles
      for (let i = sparkParticles.length - 1; i >= 0; i--) {
        const sp = sparkParticles[i];
        sp.life -= delta;
        if (sp.life <= 0) {
          scene.remove(sp.mesh);
          sparkParticles.splice(i, 1);
          continue;
        }
        sp.vy -= 9.8 * delta;
        sp.mesh.position.x += sp.vx * delta;
        sp.mesh.position.y = Math.max(0.05, sp.mesh.position.y + sp.vy * delta);
        sp.mesh.position.z += sp.vz * delta;
        const progress = sp.life / sp.maxLife;
        sp.mesh.scale.setScalar(progress);
      }

      // Update floating combat texts
      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.life -= delta;
        if (ft.life <= 0) {
          scene.remove(ft.sprite);
          ft.texture.dispose();
          ft.sprite.material.dispose();
          floatingTexts.splice(i, 1);
          continue;
        }
        ft.sprite.position.y += ft.vy * delta;
        ft.sprite.material.opacity = ft.life / ft.maxLife;
      }

      renderer.render(scene, camera);
    };

    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointermove', aimMouse);
      renderer.domElement.removeEventListener('touchstart', aimTouch);
      renderer.domElement.removeEventListener('touchmove', aimTouch);
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) => m.dispose());
        }
      });
      element.replaceChildren();
    };
  }, [inputRef]);

  return <div className="arena-canvas" ref={mount} aria-label="Three-dimensional neon combat arena" />;
}
