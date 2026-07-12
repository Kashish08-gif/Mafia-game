/**
 * CasinoEnvironment.jsx
 *
 * Loads the casino scene GLB and extracts per-mesh AABBs for collision.
 *
 * Collision strategy — automatic, no hardcoding:
 *   • After clone.updateMatrixWorld(true), traverse every Mesh.
 *   • Compute each mesh's world-space AABB using its buffer geometry +
 *     matrixWorld (avoids the wrong-double-add bug of getWorldPosition).
 *   • Scale by 0.075 → R3F world-space coordinates.
 *   • Filter to "furniture-sized" objects (not floors, ceilings, or walls).
 *   • Store ALL furniture boxes as window.casinoColliders.
 *   • Identify chairs/tables by mesh name (or by size heuristic if unnamed).
 *
 * Player.jsx tests every movement attempt against casinoColliders for
 * cylinder-AABB intersection in the XZ plane → automatic collision with
 * every solid object in the scene.
 */

import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const CASINO_SCENE_PATH = '/models/casino/gameready_casino_scene.glb';
const SCALE = 0.075;

useGLTF.preload(CASINO_SCENE_PATH);

// Module-level initialise — guarantees arrays exist before GLB loads
// so Player.jsx's first frame never sees undefined.
if (!window.casinoColliders) window.casinoColliders = [];
if (!window.casinoChairs)    window.casinoChairs    = [];
if (!window.casinoTables)    window.casinoTables    = [];

// ─────────────────────────────────────────────────────────────────
function scaledAABB(box3) {
  // box3 is in detached-clone world space; multiply by SCALE → R3F world space.
  // Ensure min/max are still correct (SCALE > 0 so ordering is preserved).
  return {
    minX: box3.min.x * SCALE,  maxX: box3.max.x * SCALE,
    minY: box3.min.y * SCALE,  maxY: box3.max.y * SCALE,
    minZ: box3.min.z * SCALE,  maxZ: box3.max.z * SCALE,
  };
}

// ─────────────────────────────────────────────────────────────────
export default function CasinoEnvironment() {
  const { scene } = useGLTF(CASINO_SCENE_PATH);

  const processedScene = useMemo(() => {
    const clone = scene.clone();

    // Apply shadows & roughness
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow    = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.roughness = Math.max(child.material.roughness || 0, 0.4);
        }
      }
    });

    // Centre the scene footprint
    const bbox   = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    clone.position.set(-center.x, -bbox.min.y, -center.z);

    // ── CRITICAL: update world matrices before any getWorldPosition /
    // Box3 computations on the detached hierarchy ────────────────────
    clone.updateMatrixWorld(true);

    // ── Collect mesh names (first 40) for debugging ─────────────────
    const meshNames = [];
    clone.traverse((c) => { if (c.isMesh && c.name) meshNames.push(c.name); });
    console.log('[Casino] mesh count:', meshNames.length,
                '| first names:', meshNames.slice(0, 20));

    // ── Build furniture-sized AABB colliders ─────────────────────────
    //
    //  Furniture filter (R3F world space after ×SCALE):
    //    • sizeX, sizeZ < 6 m  → excludes floor/ceiling/long walls
    //    • sizeY < 2.5 m       → excludes tall walls
    //    • sizeY > 0.07 m      → excludes flat decals/markings
    //    • maxY > 0.05 m       → above ground level
    //    • minY < 1.8 m        → below camera (at player height)
    //
    const colliders = [];
    const chairs    = [];
    const tables    = [];
    const geomBox   = new THREE.Box3();   // reused

    clone.traverse((child) => {
      if (!child.isMesh) return;
      const geo = child.geometry;
      if (!geo?.attributes?.position) return;

      // Compute tight AABB of this mesh's geometry in world space
      geomBox.setFromBufferAttribute(geo.attributes.position);
      geomBox.applyMatrix4(child.matrixWorld);       // detached-tree world space
      const ab = scaledAABB(geomBox);                // → R3F world space

      const sizeX = ab.maxX - ab.minX;
      const sizeY = ab.maxY - ab.minY;
      const sizeZ = ab.maxZ - ab.minZ;

      if (
        sizeX > 0.05 && sizeZ > 0.05 &&              // not degenerate
        !(sizeX > 12 && sizeZ > 12) &&               // not a giant floor/ceiling (e.g. 15m x 15m+)
        sizeY > 0.05 && sizeY < 2.5 &&               // physical height range (excludes ceiling-only items)
        ab.maxY > 0.05 &&                            // above ground level
        ab.minY < 2.0                                // within player height
      ) {
        colliders.push({ ...ab, name: child.name });

        const cx = (ab.minX + ab.maxX) / 2;
        const cy = (ab.minY + ab.maxY) / 2;
        const cz = (ab.minZ + ab.maxZ) / 2;
        const nm = child.name.toLowerCase();

        // Named chair detection
        if (nm.includes('chair') || nm.includes('stool') || nm.includes('seat')) {
          chairs.push({ id: child.uuid, name: child.name, pos: [cx, cy, cz], yaw: 0 });
        }

        // Named table detection (exclude bar/counter/roulette/register/cash/wheel/slots)
        if (
          (nm.includes('table') || nm.includes('blackjack') || nm.includes('poker') || nm.includes('card')) &&
          !nm.includes('bar') && !nm.includes('counter') && !nm.includes('roulette') && !nm.includes('register') && !nm.includes('cash') && !nm.includes('wheel') && !nm.includes('slot')
        ) {
          tables.push({ id: child.uuid, name: child.name, pos: [cx, cy, cz], yaw: 0 });
        }
      }
    });

    console.log('[Casino] furniture colliders:', colliders.length,
                '| named chairs:', chairs.length,
                '| named tables:', tables.length);

    // ── Heuristic fallbacks when mesh names are generic ──────────────
    // Always run heuristics in addition to name detection to ensure all
    // objects are collected, but avoid adding duplicate positions.
    if (colliders.length > 0) {
      colliders.forEach((box) => {
        const sx = box.maxX - box.minX;
        const sy = box.maxY - box.minY;
        const sz = box.maxZ - box.minZ;
        const nmBox = (box.name || '').toLowerCase();

        // Chair heuristic: small footprint, height between 0.4m and 2.0m (for high-back chairs)
        if (sx < 1.1 && sz < 1.1 && sy > 0.4 && sy < 2.0) {
          const cx = (box.minX + box.maxX) / 2;
          const cy = (box.minY + box.maxY) / 2;
          const cz = (box.minZ + box.maxZ) / 2;

          const exists = chairs.some(c => Math.hypot(c.pos[0] - cx, c.pos[2] - cz) < 0.35);
          if (!exists) {
            chairs.push({
              id: `auto-chair-${cx.toFixed(2)}-${cz.toFixed(2)}`,
              name: box.name || 'Chair',
              pos: [cx, cy, cz],
              yaw: 0,
            });
          }
        }

        // Table heuristic: footprint > 0.8m, height < 1.4m (exclude bar/counter/roulette/slots)
        if (
          sx > 0.8 && sz > 0.8 && sy < 1.4 &&
          !nmBox.includes('bar') && !nmBox.includes('counter') && !nmBox.includes('roulette') && !nmBox.includes('register') && !nmBox.includes('cash') && !nmBox.includes('wheel') && !nmBox.includes('slot')
        ) {
          const cx = (box.minX + box.maxX) / 2;
          const cy = (box.minY + box.maxY) / 2;
          const cz = (box.minZ + box.maxZ) / 2;

          const exists = tables.some(t => Math.hypot(t.pos[0] - cx, t.pos[2] - cz) < 0.4);
          if (!exists) {
            tables.push({
              id: `auto-table-${cx.toFixed(2)}-${cz.toFixed(2)}`,
              name: box.name || 'Table',
              pos: [cx, cy, cz],
              yaw: 0,
            });
          }
        }
      });
    }

    console.log('[Casino] Final chairs collected:', chairs.length, '| tables collected:', tables.length);

    // Publish globally — Player.jsx + GameScene.jsx read these
    window.casinoColliders = colliders;

    // Merge dynamically detected chairs with existing chairs (like hardcoded discussion chairs)
    const existingChairs = window.casinoChairs || [];
    const mergedChairs = [...existingChairs];
    chairs.forEach(c => {
      const exists = mergedChairs.some(ec => Math.hypot(ec.pos[0] - c.pos[0], ec.pos[2] - c.pos[2]) < 0.8);
      if (!exists) {
        mergedChairs.push(c);
      }
    });
    window.casinoChairs = mergedChairs;

    if (tables.length > 0) {
      // Sort tables so the one with the most surrounding chairs (within 4.5m) is at index 0 (the discussion table)
      if (mergedChairs.length > 0) {
        tables.sort((a, b) => {
          const countA = mergedChairs.filter(c => Math.hypot(c.pos[0] - a.pos[0], c.pos[2] - a.pos[2]) < 4.5).length;
          const countB = mergedChairs.filter(c => Math.hypot(c.pos[0] - b.pos[0], c.pos[2] - b.pos[2]) < 4.5).length;
          return countB - countA;
        });
      }
      window.casinoTables = tables;
      console.log('[Casino] sorted tables. Primary discussion table:', tables[0]?.name, 'at', tables[0]?.pos);
    }

    // ── Wrap and return ───────────────────────────────────────────────
    const wrapper = new THREE.Group();
    wrapper.add(clone);
    return wrapper;
  }, [scene]);

  return (
    <primitive
      object={processedScene}
      position={[0, 0, 0]}
      scale={[SCALE, SCALE, SCALE]}
    />
  );
}
