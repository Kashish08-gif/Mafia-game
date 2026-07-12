/**
 * Player.jsx
 * WASD + Pointer-Lock mouse-look character controller.
 *
 * Collision system (5 layers — ALL dynamic, zero hardcoding):
 *   L1  Outer map bounds (simple constant).
 *   L2  External building boxes from BUILDINGS (all except 'casino', which
 *       is only a minimap annotation — its 3D geometry is the GLB itself).
 *   L3  GLB mesh AABBs from window.casinoColliders — cylinder-AABB test in
 *       the XZ plane. Populated by CasinoEnvironment after the GLB loads.
 *       Covers EVERY solid object: chairs, tables, slot machines, counters…
 *   L4  Dynamic chair cylinders from window.casinoChairs (extra safety margin
 *       so the player can't clip into a chair they're approaching to sit).
 *
 * Sitting:
 *   Press E (or click Interact) when within 2.5 m of any chair in
 *   window.casinoChairs.  The player snaps to the chair centre and faces
 *   the nearest table.  Press E again, or any WASD key, to stand up.
 */

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ── Constants ────────────────────────────────────────────────────
const WALK_SPEED      = 5;
const SPRINT_SPEED    = 9;
const BOUNDS          = 60;          // hard outer limit (covers full map)
const CAM_DIST        = 6;
const CAM_HEIGHT_BASE = 4.2;
const PITCH_MIN       = -0.05;
const PITCH_MAX       = 0.18;
const PLAYER_RADIUS   = 0.42;       // player's collision cylinder radius (m)
const MOUSE_SENS      = 0.0025;
const DRAG_SENS       = 0.005;
const CAM_LERP        = 10;
const LOOK_LERP       = 14;
const SIT_RANGE       = 2.5;        // metres — how close to trigger sit

// ── AABB-Cylinder intersection (XZ plane only) ───────────────────
// Returns true if a vertical cylinder at (cx,cz) with radius r
// intersects the AABB {minX,maxX,minZ,maxZ}.
function cylAABB(cx, cz, r, box) {
  const nearX = Math.max(box.minX, Math.min(cx, box.maxX));
  const nearZ = Math.max(box.minZ, Math.min(cz, box.maxZ));
  const dx = cx - nearX;
  const dz = cz - nearZ;
  return (dx * dx + dz * dz) < (r * r);
}

// ─────────────────────────────────────────────────────────────────
export default function Player({
  position,
  setPosition,
  rotation,
  setRotation,
  onMoving,
  buildings = [],
  phase     = 'DAY',
  isSitting = false,
  setIsSitting,
  players = [],
}) {
  const { camera, gl } = useThree();

  // ── Input refs ───────────────────────────────────────────────────
  const keys      = useRef({});
  const yaw       = useRef(rotation);
  const pitch     = useRef(0.1);
  const dragging  = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const locked    = useRef(false);

  // ── Authoritative position (mutable ref — avoids stale-closure jitter) ──
  const posRef          = useRef(null);
  const prevYaw         = useRef(rotation);
  const sittingChairRef = useRef(null);

  // ── Pre-allocated Vector3s (zero GC pressure per frame) ─────────
  const camTarget = useRef(new THREE.Vector3());
  const lookTmp   = useRef(new THREE.Vector3());
  const lookTgt   = useRef(new THREE.Vector3(0, 1.4, 0));

  // Init posRef once on mount
  useEffect(() => {
    posRef.current = [...position];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Debug: expose current position in DevTools ───────────────────
  useEffect(() => {
    const id = setInterval(() => {
      if (posRef.current)
        window._playerPos = posRef.current.map(v => +v.toFixed(2));
    }, 400);
    return () => clearInterval(id);
  }, []);

  // ── Nearest chair helper ────────────────────────────────────────
  const getNearestChair = () => {
    if (phase !== 'DAY') return { chair: null, dist: Infinity };

    const chairs = window.casinoChairs;
    // Use the hardcoded discussion table position (published by DiscussionCorner)
    const tablePos = window.discussionTablePos;
    const tableRadius = window.discussionTableRadius || 5.0;
    if (!chairs || chairs.length === 0) return { chair: null, dist: Infinity };
    if (!tablePos) return { chair: null, dist: Infinity };

    const [px, , pz] = posRef.current || position;
    let nearest = null, minDist = Infinity;

    chairs.forEach((c) => {
      // 1. Only consider chairs near the discussion table
      const distToTable = Math.hypot(c.pos[0] - tablePos[0], c.pos[2] - tablePos[2]);
      if (distToTable > tableRadius) return;

      // 2. Check if occupied by another player
      const isOccupied = players.some(p => {
        if (!p.sitting) return false;
        const rx = p.position?.x ?? 0;
        const rz = p.position?.z ?? 0;
        return Math.hypot(c.pos[0] - rx, c.pos[2] - rz) < 0.6;
      });
      if (isOccupied) return;

      const d = Math.hypot(c.pos[0] - px, c.pos[2] - pz);
      if (d < minDist) { minDist = d; nearest = c; }
    });
    return { chair: nearest, dist: minDist };
  };

  // ── Sit / stand handler (stored in a ref to avoid stale closures) ─
  const handleInteractRef = useRef();
  handleInteractRef.current = () => {
    if (isSitting) {
      // Stand up — eject player behind the chair so they clear its collider
      const chair = sittingChairRef.current;
      if (chair) {
        const sx = chair.pos[0] - Math.sin(chair.yaw) * 1.2;
        const sz = chair.pos[2] - Math.cos(chair.yaw) * 1.2;
        posRef.current = [sx, 0, sz];
        setPosition([sx, 0, sz]);
      }
      setIsSitting(false);
      sittingChairRef.current = null;

    } else {
      const { chair, dist } = getNearestChair();
      if (chair && dist < SIT_RANGE) {
        posRef.current = [chair.pos[0], 0, chair.pos[2]];
        setPosition([chair.pos[0], 0, chair.pos[2]]);

        // Face the hardcoded discussion table center when sitting
        const tablePos = window.discussionTablePos;
        let facingYaw = chair.yaw + Math.PI;
        if (tablePos) {
          facingYaw = Math.atan2(
            tablePos[0] - chair.pos[0],
            tablePos[2] - chair.pos[2],
          );
        }

        yaw.current = facingYaw;
        setRotation(facingYaw);
        setIsSitting(true);
        sittingChairRef.current = chair;
      } else {
        console.log(
          '[Player] E pressed — nothing nearby to sit on.',
          '| player:', posRef.current?.map(v => +v.toFixed(2)),
          '| nearest chair dist:', dist?.toFixed(2),
          '| chairs loaded:', window.casinoChairs?.length,
        );
      }
    }
  };

  // ── Pointer-lock + keyboard / mouse listeners ────────────────────
  useEffect(() => {
    const canvas = gl.domElement;

    const onKeyDown   = (e) => {
      keys.current[e.code] = true;
      if (e.code === 'KeyE') handleInteractRef.current();
    };
    const onKeyUp     = (e) => { keys.current[e.code] = false; };
    const reqLock     = ()  => { if (!document.pointerLockElement) canvas.requestPointerLock(); };
    const onLockChg   = ()  => { locked.current = document.pointerLockElement === canvas; };
    const onMouseMove = (e) => {
      if (locked.current) {
        yaw.current  -= e.movementX * MOUSE_SENS;
        pitch.current = Math.max(PITCH_MIN, Math.min(PITCH_MAX,
                          pitch.current - e.movementY * MOUSE_SENS));
      } else if (dragging.current) {
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        yaw.current  -= dx * DRAG_SENS;
        pitch.current = Math.max(PITCH_MIN, Math.min(PITCH_MAX,
                          pitch.current - dy * DRAG_SENS));
      }
    };
    const onMouseDown = (e) => {
      if (e.button === 2) { dragging.current = true; lastMouse.current = { x: e.clientX, y: e.clientY }; }
    };
    const onMouseUp   = (e) => { if (e.button === 2) dragging.current = false; };
    const noCtx       = (e) => e.preventDefault();
    const onInteract  = ()  => handleInteractRef.current();

    canvas.addEventListener('click',               reqLock);
    document.addEventListener('pointerlockchange', onLockChg);
    window.addEventListener('keydown',    onKeyDown);
    window.addEventListener('keyup',      onKeyUp);
    window.addEventListener('mousemove',  onMouseMove);
    window.addEventListener('mousedown',  onMouseDown);
    window.addEventListener('mouseup',    onMouseUp);
    window.addEventListener('contextmenu', noCtx);
    window.addEventListener('game-interact', onInteract);

    return () => {
      canvas.removeEventListener('click',               reqLock);
      document.removeEventListener('pointerlockchange', onLockChg);
      window.removeEventListener('keydown',    onKeyDown);
      window.removeEventListener('keyup',      onKeyUp);
      window.removeEventListener('mousemove',  onMouseMove);
      window.removeEventListener('mousedown',  onMouseDown);
      window.removeEventListener('mouseup',    onMouseUp);
      window.removeEventListener('contextmenu', noCtx);
      window.removeEventListener('game-interact', onInteract);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl]);

  // Auto stand up when phase changes away from DAY
  useEffect(() => {
    if (phase !== 'DAY' && isSitting) {
      const chair = sittingChairRef.current;
      if (chair) {
        const sx = chair.pos[0] - Math.sin(chair.yaw) * 1.2;
        const sz = chair.pos[2] - Math.cos(chair.yaw) * 1.2;
        posRef.current = [sx, 0, sz];
        setPosition([sx, 0, sz]);
      }
      setIsSitting(false);
      sittingChairRef.current = null;
    }
  }, [phase, isSitting, setPosition, setIsSitting]);

  // ── Collision helper ─────────────────────────────────────────────
  function isBlocked(x, z) {
    // L1 — outer bounds
    if (x < -BOUNDS || x > BOUNDS || z < -BOUNDS || z > BOUNDS) return true;

    // L2 — external solid buildings (skip casino — its walls come from the GLB)
    for (const b of buildings) {
      if (b.id === 'casino' || b.id === 'garden' || b.id === 'helipad') continue;
      const [bx, bz]   = b.pos;
      const [bw, , bd] = b.size;
      if (
        Math.abs(x - bx) < bw / 2 + PLAYER_RADIUS &&
        Math.abs(z - bz) < bd / 2 + PLAYER_RADIUS
      ) return true;
    }

    // L3 — GLB mesh AABB colliders (furniture, walls, counters…)
    const cols = window.casinoColliders;
    if (cols && cols.length > 0) {
      for (const box of cols) {
        if (cylAABB(x, z, PLAYER_RADIUS, box)) return true;
      }
    }

    // L4 — extra chair cylinders (thin objects that may not have enough
    //       XZ extent to be caught by the box test alone)
    const chairs = window.casinoChairs;
    if (chairs && chairs.length > 0) {
      for (const c of chairs) {
        if (isSitting && sittingChairRef.current?.id === c.id) continue; // skip our own chair
        if (Math.hypot(x - c.pos[0], z - c.pos[2]) < 0.38 + PLAYER_RADIUS) return true;
      }
    }

    // L5 — Discussion Table collider (cylinder check)
    const tablePos = window.discussionTablePos;
    if (tablePos) {
      if (Math.hypot(x - tablePos[0], z - tablePos[2]) < 2.2 + PLAYER_RADIUS) return true;
    }

    return false;
  }

  // ── Per-frame movement + camera ──────────────────────────────────
  useFrame((_, delta) => {
    if (!posRef.current) return;

    const k      = keys.current;
    const sprint = k['ShiftLeft'] || k['ShiftRight'];
    const speed  = (sprint ? SPRINT_SPEED : WALK_SPEED) * delta;

    let dx = 0, dz = 0;
    if (k['KeyW'] || k['ArrowUp'])    dz -= 1;
    if (k['KeyS'] || k['ArrowDown'])  dz += 1;
    if (k['KeyA'] || k['ArrowLeft'])  dx -= 1;
    if (k['KeyD'] || k['ArrowRight']) dx += 1;

    const moving = dx !== 0 || dz !== 0;
    const p = posRef.current;

    // Auto-stand when sitting + moving
    if (isSitting && moving) {
      const chair = sittingChairRef.current;
      if (chair) {
        const sx = chair.pos[0] - Math.sin(chair.yaw) * 1.2;
        const sz = chair.pos[2] - Math.cos(chair.yaw) * 1.2;
        posRef.current = [sx, 0, sz];
        setPosition([sx, 0, sz]);
      }
      setIsSitting(false);
      sittingChairRef.current = null;
      return;
    }

    if (moving && !isSitting) {
      const len = Math.hypot(dx, dz);
      dx /= len; dz /= len;

      // Project WASD into world-space using current yaw
      const cos = Math.cos(yaw.current);
      const sin = Math.sin(yaw.current);
      const wx  = (-dz) * sin + dx * cos;   // world X component
      const wz  = (-dz) * cos - dx * sin;   // world Z component

      // Axis-separated so player slides smoothly along walls/chairs
      const tryX = p[0] + wx * speed;
      if (!isBlocked(tryX, p[2])) p[0] = tryX;

      const tryZ = p[2] + wz * speed;
      if (!isBlocked(p[0], tryZ)) p[2] = tryZ;

      setPosition([p[0], 0, p[2]]);
    }

    onMoving(moving);

    // Avatar yaw = camera yaw (unless sitting)
    if (!isSitting && Math.abs(yaw.current - prevYaw.current) > 0.0005) {
      setRotation(yaw.current);
      prevYaw.current = yaw.current;
    }

    // ── Smooth 3rd-person camera ─────────────────────────────────
    const cp = Math.cos(pitch.current);
    const sp = Math.sin(pitch.current);

    camTarget.current.set(
      p[0] - Math.sin(yaw.current) * CAM_DIST * cp,
      CAM_HEIGHT_BASE + sp * CAM_DIST * 0.6,
      p[2] - Math.cos(yaw.current) * CAM_DIST * cp,
    );
    camera.position.lerp(camTarget.current, Math.min(1, delta * CAM_LERP));

    lookTmp.current.set(
      p[0] + Math.sin(yaw.current) * 0.5,
      1.4  - sp * 2.0,
      p[2] + Math.cos(yaw.current) * 0.5,
    );
    lookTgt.current.lerp(lookTmp.current, Math.min(1, delta * LOOK_LERP));
    camera.lookAt(lookTgt.current);
  });

  return null;
}
