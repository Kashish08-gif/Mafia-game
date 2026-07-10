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
        sizeX < 6    && sizeZ < 6    &&              // not a wall / floor
        sizeY > 0.07 && sizeY < 2.5 &&              // furniture height range
        ab.maxY > 0.05 &&                            // above ground
        ab.minY < 1.8                                // within player height
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

        // Named table detection
        if (
          nm.includes('table') || nm.includes('blackjack') ||
          nm.includes('poker') || nm.includes('card')
        ) {
          tables.push({ id: child.uuid, name: child.name, pos: [cx, cy, cz], yaw: 0 });
        }
      }
    });

    console.log('[Casino] furniture colliders:', colliders.length,
                '| named chairs:', chairs.length,
                '| named tables:', tables.length);

    // ── Heuristic fallbacks when mesh names are generic ──────────────
    //
    //  Chair heuristic: small objects (XZ footprint < 1.0 m) with
    //  enough height to be a chair back (> 0.5 m).
    //
    if (chairs.length === 0 && colliders.length > 0) {
      colliders.forEach((box) => {
        const sx = box.maxX - box.minX;
        const sy = box.maxY - box.minY;
        const sz = box.maxZ - box.minZ;
        if (sx < 1.0 && sz < 1.0 && sy > 0.5) {
          const cx = (box.minX + box.maxX) / 2;
          const cy = (box.minY + box.maxY) / 2;
          const cz = (box.minZ + box.maxZ) / 2;
          chairs.push({
            id:   `auto-chair-${cx.toFixed(2)}-${cz.toFixed(2)}`,
            name: box.name || 'Chair',
            pos:  [cx, cy, cz],
            yaw:  0,
          });
        }
      });
      console.log('[Casino] heuristic chairs found:', chairs.length);
    }

    //  Table heuristic: large horizontal surfaces (XZ footprint > 0.8 m
    //  both dimensions, height < 1.2 m).
    //
    if (tables.length === 0 && colliders.length > 0) {
      colliders.forEach((box) => {
        const sx = box.maxX - box.minX;
        const sy = box.maxY - box.minY;
        const sz = box.maxZ - box.minZ;
        if (sx > 0.8 && sz > 0.8 && sy < 1.2) {
          const cx = (box.minX + box.maxX) / 2;
          const cy = (box.minY + box.maxY) / 2;
          const cz = (box.minZ + box.maxZ) / 2;
          tables.push({
            id:   `auto-table-${cx.toFixed(2)}-${cz.toFixed(2)}`,
            name: box.name || 'Table',
            pos:  [cx, cy, cz],
            yaw:  0,
          });
        }
      });
      console.log('[Casino] heuristic tables found:', tables.length);
    }

    // Publish globally — Player.jsx + GameScene.jsx read these
    window.casinoColliders = colliders;
    if (chairs.length > 0) {
      window.casinoChairs = chairs;
      console.log('[Casino] sample chair pos:', chairs[0]?.pos);
    }
    if (tables.length > 0) {
      window.casinoTables = tables;
      console.log('[Casino] sample table pos:', tables[0]?.pos);
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
