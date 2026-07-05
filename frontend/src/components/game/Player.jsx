/**
 * Player.jsx
 * WASD + right-mouse-drag character controller.
 * Extracted from the inline CharacterController in GameMapPage.jsx
 * so GameScene.jsx can import it as a standalone component.
 *
 * Props:
 *   position     — current [x,y,z] of the local player
 *   setPosition  — setter for position
 *   rotation     — current yaw (radians)
 *   setRotation  — setter for rotation
 *   onMoving     — callback(bool) fired every frame
 *   buildings    — array of building collision boxes from BUILDINGS constant
 */

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

const WALK_SPEED   = 5;
const SPRINT_SPEED = 9;
const BOUNDS       = 50; // half-size of playable area
const CAM_DIST     = 9;
const CAM_HEIGHT   = 5.5;

export default function Player({
  position,
  setPosition,
  rotation,
  setRotation,
  onMoving,
  buildings = [],
}) {
  const { camera } = useThree();
  const keys        = useRef({});
  const yaw         = useRef(rotation);
  const dragging    = useRef(false);
  const lastMouse   = useRef({ x: 0, y: 0 });

  // ── Keyboard + mouse event listeners ────────────────────────
  useEffect(() => {
    const onKeyDown  = (e) => { keys.current[e.code] = true; };
    const onKeyUp    = (e) => { keys.current[e.code] = false; };
    const onMouseDown = (e) => {
      if (e.button === 2) {
        dragging.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
      }
    };
    const onMouseUp   = (e) => { if (e.button === 2) dragging.current = false; };
    const onMouseMove  = (e) => {
      if (!dragging.current) return;
      const dx = e.clientX - lastMouse.current.x;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      yaw.current -= dx * 0.005;
    };
    const onContextMenu = (e) => e.preventDefault();

    window.addEventListener('keydown',      onKeyDown);
    window.addEventListener('keyup',        onKeyUp);
    window.addEventListener('mousedown',    onMouseDown);
    window.addEventListener('mouseup',      onMouseUp);
    window.addEventListener('mousemove',    onMouseMove);
    window.addEventListener('contextmenu',  onContextMenu);

    return () => {
      window.removeEventListener('keydown',      onKeyDown);
      window.removeEventListener('keyup',        onKeyUp);
      window.removeEventListener('mousedown',    onMouseDown);
      window.removeEventListener('mouseup',      onMouseUp);
      window.removeEventListener('mousemove',    onMouseMove);
      window.removeEventListener('contextmenu',  onContextMenu);
    };
  }, []);

  // ── Per-frame movement + camera follow ──────────────────────
  useFrame((_, delta) => {
    const k      = keys.current;
    const sprint = k['ShiftLeft'] || k['ShiftRight'];
    const speed  = (sprint ? SPRINT_SPEED : WALK_SPEED) * delta;

    let dx = 0, dz = 0;
    if (k['KeyW'] || k['ArrowUp'])    dz -= 1;
    if (k['KeyS'] || k['ArrowDown'])  dz += 1;
    if (k['KeyA'] || k['ArrowLeft'])  dx -= 1;
    if (k['KeyD'] || k['ArrowRight']) dx += 1;

    const moving = dx !== 0 || dz !== 0;

    if (moving) {
      const len = Math.hypot(dx, dz);
      dx /= len;
      dz /= len;

      const cos = Math.cos(yaw.current);
      const sin = Math.sin(yaw.current);
      const wx  = dx * cos - dz * sin;
      const wz  = dx * sin + dz * cos;

      const nx = position[0] + wx * speed;
      const nz = position[2] + wz * speed;

      // Collision: buildings + boundary
      const blocked = buildings.some((b) => {
        if (b.id === 'garden' || b.id === 'helipad') return false;
        const [bx, bz] = b.pos;
        const [bw, , bd] = b.size;
        return (
          Math.abs(nx - bx) < bw / 2 + 0.5 &&
          Math.abs(nz - bz) < bd / 2 + 0.5
        );
      });

      const outOfBounds = Math.abs(nx) > BOUNDS || Math.abs(nz) > BOUNDS;

      if (!blocked && !outOfBounds) {
        setPosition([nx, 0, nz]);
        setRotation(Math.atan2(wx, wz));
      }
    }

    onMoving(moving);

    // 3rd-person camera
    const cx = position[0] - Math.sin(yaw.current) * CAM_DIST;
    const cz = position[2] - Math.cos(yaw.current) * CAM_DIST;
    camera.position.lerp({ x: cx, y: CAM_HEIGHT, z: cz }, Math.min(1, delta * 6));
    camera.lookAt(position[0], 1.4, position[2]);
  });

  return null; // no visual — avatar rendered by PlayerAvatar
}
