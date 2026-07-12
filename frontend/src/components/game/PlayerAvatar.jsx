/**
 * PlayerAvatar.jsx
 * 3D procedural character model with realistic limb animations.
 *
 * Animation system:
 *  • walkBlend  — smoothly transitions 0→1 (idle) when walking starts/stops,
 *                 preventing the jarring snap between idle and walk poses.
 *  • walkPhase  — continuously accumulates (like a clock hand) only while
 *                 moving, so legs don't snap back to rest when you stop.
 *  • Limb groups pivot at anatomically correct joints:
 *      - Legs: pivot at hip (top of leg)   → leg + shoe swing together
 *      - Arms: pivot at shoulder (top of arm) → full arm swings
 *      - Head: pivot at neck base            → natural head bob / sway
 *      - Torso: pivot at waist               → forward lean when running
 *  • Left/right limbs are 180° out of phase (natural cross-gait)
 *  • Arms swing opposite to legs (correct human biomechanics)
 *  • Idle: gentle breathing bob + subtle head drift
 *  • Dead players: ghost transparency + halo ring
 *
 * Movement detection (for local player):
 *  • Local player doesn't receive `walking` prop, so we detect it by
 *    comparing the current `position` prop to its value last frame.
 */

import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

// ── Static geometries — declared once at module level, never recreated ────────
const TORSO_GEOMETRY        = new THREE.CylinderGeometry(0.38, 0.28, 1.0, 16);
const SHIRT_GEOMETRY        = new THREE.BoxGeometry(0.18, 0.2, 0.18);
const TIE_GEOMETRY          = new THREE.BoxGeometry(0.06, 0.35, 0.02);
const ARM_GEOMETRY          = new THREE.CylinderGeometry(0.11, 0.09, 0.75, 12);
const HEAD_GEOMETRY         = new THREE.SphereGeometry(0.26, 16, 16);
const SHADES_LENS_GEOMETRY  = new THREE.BoxGeometry(0.11, 0.06, 0.02);
const SHADES_BRIDGE_GEOMETRY= new THREE.BoxGeometry(0.08, 0.02, 0.02);
const FEDORA_BRIM_GEOMETRY  = new THREE.CylinderGeometry(0.46, 0.46, 0.02, 24);
const FEDORA_BAND_GEOMETRY  = new THREE.CylinderGeometry(0.27, 0.28, 0.05, 20);
const FEDORA_CROWN_GEOMETRY = new THREE.CylinderGeometry(0.24, 0.26, 0.18, 20);
const LEG_GEOMETRY          = new THREE.CylinderGeometry(0.12, 0.1, 0.7, 12);
const SHOE_GEOMETRY         = new THREE.BoxGeometry(0.13, 0.1, 0.22);

// ── Animation constants ───────────────────────────────────────────────────────
const LEG_SWING   = 0.42;   // max leg rotation (radians, ≈ 24°)
const ARM_SWING   = 0.32;   // max arm rotation (radians, ≈ 18°)
const BOB_HEIGHT  = 0.038;  // body vertical bob (meters)
const LEAN_AMOUNT = 0.065;  // forward body lean when walking (radians)
const HEAD_BOB    = 0.018;  // head forward-nod with each step
const WALK_HZ     = 7.5;    // walk-cycle steps per second (feel)
const BLEND_IN    = 7;      // idle→walk blend speed
const BLEND_OUT   = 5;      // walk→idle blend speed
const ROT_LERP    = 12;     // avatar yaw lerp speed (eliminates snap on turn)

// ── CharacterModel — receives refs so PlayerAvatar can animate limbs ──────────
/**
 * Hierarchy (pivot positions shown in world-space when avatar is at origin):
 *
 *  <group>                            ← outer wrapper
 *    <group ref=torsoRef [y=0.7]>     ← waist pivot for lean/sway
 *      torso mesh [y=+0.30]           (was [0,1.0,0])
 *      shirt mesh [y=+0.65, z=0.2]   (was [0,1.35,0.2])
 *      tie   mesh [y=+0.45, z=0.3]   (was [0,1.15,0.3])
 *    <group ref=leftArmRef  [-0.48, 0.675, 0]>   ← shoulder pivot
 *      arm mesh [y=-0.375, rot z=+0.15]
 *    <group ref=rightArmRef [+0.48, 0.675, 0]>
 *      arm mesh [y=-0.375, rot z=-0.15]
 *    <group ref=headRef [y=0.8]>      ← neck pivot (above torso waist offset)
 *      head   [y=+0.26]
 *      shades [y=+0.30, z=0.16]
 *      fedora parts …
 *    <group ref=leftLegRef  [-0.16, 0, 0]>   ← hip pivot (top of leg, y=0.7 world)
 *      leg  mesh [y=-0.35]
 *      shoe mesh [y=-0.64, z=0.08]
 *    <group ref=rightLegRef [+0.16, 0, 0]>
 *      leg  mesh [y=-0.35]
 *      shoe mesh [y=-0.64, z=0.08]
 */
function CharacterModel({
  color,
  isAlive,
  torsoRef,
  leftArmRef,
  rightArmRef,
  headRef,
  leftLegRef,
  rightLegRef,
}) {
  const materials = useMemo(() => {
    const g = !isAlive; // ghost?
    const op = (o) => g ? 0.35 : o;
    const mk = (opts) => new THREE.MeshStandardMaterial({ transparent: g, opacity: op(opts.opacity ?? 1), ...opts });

    return {
      suit:    mk({ color: g ? '#5c6d7a' : '#111115', roughness: 0.8, metalness: 0.1 }),
      shirt:   mk({ color: g ? '#8ca0ba' : '#ffffff',  roughness: 0.9, metalness: 0.0 }),
      tie:     mk({ color: g ? '#4a5b6e' : (color || '#ff3344'), roughness: 0.5, metalness: 0.2 }),
      skin:    mk({ color: g ? '#aabed6' : '#e0b59b',  roughness: 0.6, metalness: 0.0 }),
      hat:     mk({ color: g ? '#43515e' : '#1e1e24',  roughness: 0.8, metalness: 0.05 }),
      hatBand: mk({ color: g ? '#4a5b6e' : (color || '#ffd700'), roughness: 0.5, metalness: 0.4 }),
      shades:  mk({ color: g ? '#2b353f' : '#0a0a0d',  roughness: 0.1, metalness: 0.9, opacity: g ? 0.3 : 0.95 }),
    };
  }, [color, isAlive]);

  useEffect(() => () => Object.values(materials).forEach(m => m.dispose()), [materials]);

  return (
    <group>
      {/* ── Torso group — pivot at waist (world y ≈ 0.7) ── */}
      <group ref={torsoRef} position={[0, 0.7, 0]}>
        <mesh castShadow receiveShadow position={[0, 0.30, 0]}  geometry={TORSO_GEOMETRY} material={materials.suit} />
        <mesh castShadow             position={[0, 0.65, 0.2]} geometry={SHIRT_GEOMETRY}  material={materials.shirt} />
        <mesh castShadow             position={[0, 0.45, 0.3]} geometry={TIE_GEOMETRY}    material={materials.tie} />

        {/* Left arm — pivot at shoulder (y = 0.675 relative to waist) */}
        <group ref={leftArmRef} position={[-0.48, 0.675, 0]}>
          <mesh castShadow position={[0, -0.375, 0]} rotation={[0, 0,  0.15]} geometry={ARM_GEOMETRY} material={materials.suit} />
        </group>

        {/* Right arm — pivot at shoulder */}
        <group ref={rightArmRef} position={[0.48, 0.675, 0]}>
          <mesh castShadow position={[0, -0.375, 0]} rotation={[0, 0, -0.15]} geometry={ARM_GEOMETRY} material={materials.suit} />
        </group>
      </group>

      {/* ── Head group — pivot at neck base (world y ≈ 1.5) ── */}
      <group ref={headRef} position={[0, 1.5, 0]}>
        {/* Head */}
        <mesh castShadow position={[0,  0.26, 0]} geometry={HEAD_GEOMETRY} material={materials.skin} />

        {/* Shades */}
        <group position={[0, 0.30, 0.16]}>
          <mesh castShadow position={[-0.09, 0, 0.08]} geometry={SHADES_LENS_GEOMETRY}   material={materials.shades} />
          <mesh castShadow position={[ 0.09, 0, 0.08]} geometry={SHADES_LENS_GEOMETRY}   material={materials.shades} />
          <mesh castShadow position={[    0, 0.01, 0.08]} geometry={SHADES_BRIDGE_GEOMETRY} material={materials.shades} />
        </group>

        {/* Fedora — brim / band / crown */}
        <mesh castShadow position={[0, 0.48,  0   ]} rotation={[0.05, 0, 0]} geometry={FEDORA_BRIM_GEOMETRY}  material={materials.hat} />
        <mesh castShadow position={[0, 0.56,  0   ]} rotation={[0.05, 0, 0]} geometry={FEDORA_BAND_GEOMETRY}  material={materials.hatBand} />
        <mesh castShadow position={[0, 0.65, -0.01]} rotation={[0.05, 0, 0]} geometry={FEDORA_CROWN_GEOMETRY} material={materials.hat} />
      </group>

      {/* ── Left leg group — pivot at hip (world y = 0.7) ── */}
      <group ref={leftLegRef} position={[-0.16, 0.7, 0]}>
        <mesh castShadow position={[0, -0.35,  0   ]} geometry={LEG_GEOMETRY}  material={materials.suit} />
        <mesh castShadow position={[0, -0.64,  0.08]} geometry={SHOE_GEOMETRY} material={materials.suit} />
      </group>

      {/* ── Right leg group — pivot at hip ── */}
      <group ref={rightLegRef} position={[0.16, 0.7, 0]}>
        <mesh castShadow position={[0, -0.35,  0   ]} geometry={LEG_GEOMETRY}  material={materials.suit} />
        <mesh castShadow position={[0, -0.64,  0.08]} geometry={SHOE_GEOMETRY} material={materials.suit} />
      </group>
    </group>
  );
}

// ── Main PlayerAvatar export ──────────────────────────────────────────────────
export default function PlayerAvatar({
  position = [0, 0, 0],
  rotation = 0,
  color    = '#ffffff',
  name     = 'Player',
  role     = '',
  isMe     = false,
  isAlive  = true,
  walking  = false,  // provided for remote players; local player detects via position delta
  sitting  = false,
}) {
  // ── Group refs ────────────────────────────────────────────────────
  const groupRef    = useRef();   // root: world position + yaw
  const bodyRef     = useRef();   // body bob layer (vertical only)

  // ── Limb animation refs (attached to CharacterModel groups) ───────
  const torsoRef    = useRef();
  const leftArmRef  = useRef();
  const rightArmRef = useRef();
  const headRef     = useRef();
  const leftLegRef  = useRef();
  const rightLegRef = useRef();

  // ── Animation state refs ──────────────────────────────────────────
  // walkBlend: 0 = fully idle, 1 = fully walking (smoothly interpolated)
  const walkBlend   = useRef(0);
  // walkPhase: continuously accumulates so limbs don't snap when stopping
  const walkPhase   = useRef(0);
  // prevPos: used to detect movement for the local player (no walking prop)
  const prevPos     = useRef([...position]);
  // smoothRot: current displayed yaw (lerped toward target)
  const smoothRot   = useRef(rotation);

  // ── Per-frame animation ───────────────────────────────────────────
  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;

    // ── 1. Detect movement (local player has no walking prop) ───────
    const posDelta = Math.hypot(
      position[0] - prevPos.current[0],
      position[2] - prevPos.current[2],
    );
    const isWalking = walking || posDelta > 0.001;
    prevPos.current[0] = position[0];
    prevPos.current[2] = position[2];

    // ── 2. Smooth world position + rotation of root group ───────────
    if (groupRef.current) {
      // Lerp position (especially useful for remote players arriving in steps)
      // When sitting, visually elevate the player to sit on the high casino stool seat (net butt height ~0.78m)
      const targetY = position[1] + (sitting ? 1.10 : 0);
      groupRef.current.position.lerp(
        { x: position[0], y: targetY, z: position[2] },
        Math.min(1, delta * 18),
      );
      // Lerp yaw — shortest-arc to avoid 360° spin
      const targetYaw = rotation;
      let diff = ((targetYaw - smoothRot.current) + Math.PI) % (Math.PI * 2) - Math.PI;
      smoothRot.current += diff * Math.min(1, delta * ROT_LERP);
      groupRef.current.rotation.y = smoothRot.current;
    }

    // ── 3. Blend walk / idle ─────────────────────────────────────────
    const blendSpeed = isWalking ? BLEND_IN : BLEND_OUT;
    walkBlend.current = THREE.MathUtils.lerp(
      walkBlend.current,
      isWalking ? 1.0 : 0.0,
      Math.min(1, delta * blendSpeed),
    );
    const b = walkBlend.current; // shorthand

    // ── 4. Accumulate walk phase only while blending > 0.05 ─────────
    if (b > 0.05) {
      walkPhase.current += delta * WALK_HZ * b;
    }
    const phase = walkPhase.current;

    // ── 5. Compute animation values ──────────────────────────────────
    // If sitting, override targets for sitting posture (dangle legs naturally at -0.85 rad)
    const legSwing   = sitting ? -0.85 : Math.sin(phase) * LEG_SWING * b;
    const armSwing   = sitting ? -0.45 : Math.sin(phase) * ARM_SWING * b;
    const bob        = sitting ? -0.32 : (1 - Math.cos(phase * 2)) * 0.5 * BOB_HEIGHT * b;
    const lean       = sitting ? 0 : b * LEAN_AMOUNT;
    const headNod    = sitting ? 0 : Math.sin(phase * 2) * HEAD_BOB * b;

    // Idle: breathing + gentle head sway
    const breathY    = Math.sin(t * 1.8)  * 0.015 * (1 - b);
    const idleHeadZ  = Math.sin(t * 0.55) * 0.022 * (1 - b);

    // ── 6. Apply to body bob layer ───────────────────────────────────
    if (bodyRef.current) {
      bodyRef.current.position.y = bob + (sitting ? 0 : breathY);
    }

    // ── 7. Torso lean + gentle sway ──────────────────────────────────
    if (torsoRef.current) {
      torsoRef.current.rotation.x = THREE.MathUtils.lerp(
        torsoRef.current.rotation.x, lean, delta * 6,
      );
    }

    // ── 8. Legs — left/right 180° out of phase ────────────────────────
    if (leftLegRef.current) {
      leftLegRef.current.rotation.x = THREE.MathUtils.lerp(
        leftLegRef.current.rotation.x, legSwing, delta * 20,
      );
      leftLegRef.current.rotation.y = THREE.MathUtils.lerp(
        leftLegRef.current.rotation.y, 0, delta * 20,
      );
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.x = THREE.MathUtils.lerp(
        rightLegRef.current.rotation.x, sitting ? -0.85 : -legSwing, delta * 20,
      );
      rightLegRef.current.rotation.y = THREE.MathUtils.lerp(
        rightLegRef.current.rotation.y, 0, delta * 20,
      );
    }

    // ── 9. Arms — swing opposite to ipsilateral leg ───────────────────
    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = THREE.MathUtils.lerp(
        leftArmRef.current.rotation.x, -armSwing, delta * 20,
      );
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = THREE.MathUtils.lerp(
        rightArmRef.current.rotation.x, armSwing, delta * 20,
      );
    }

    // ── 10. Head — nod with steps + idle sway ────────────────────────
    if (headRef.current) {
      headRef.current.rotation.x = THREE.MathUtils.lerp(
        headRef.current.rotation.x, headNod, delta * 10,
      );
      headRef.current.rotation.z = THREE.MathUtils.lerp(
        headRef.current.rotation.z, idleHeadZ, delta * 4,
      );
    }
  });

  return (
    <group ref={groupRef}>
      {/* Body bob layer */}
      <group ref={bodyRef}>
        <CharacterModel
          color={color}
          isAlive={isAlive}
          torsoRef={torsoRef}
          leftArmRef={leftArmRef}
          rightArmRef={rightArmRef}
          headRef={headRef}
          leftLegRef={leftLegRef}
          rightLegRef={rightLegRef}
        />

        {/* Dead-player halo ring */}
        {!isAlive && (
          <mesh position={[0, 2.4, 0]}>
            <torusGeometry args={[0.22, 0.035, 8, 24]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2.0} />
          </mesh>
        )}

        {/* Colour indicator ring at feet */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.28, 0.38, 24]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isMe ? 2.5 : 1.2}
            transparent
            opacity={0.85}
          />
        </mesh>

        {/* Local-player glow */}
        {isMe && (
          <pointLight position={[0, 1, 0]} color={color} intensity={1.8} distance={4} decay={2} />
        )}
      </group>

      {/* Floating name tag */}
      <Html position={[0, 2.6, 0]} center distanceFactor={10}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pointerEvents: 'none',
            userSelect: 'none',
            fontFamily: 'Inter, system-ui, sans-serif',
            whiteSpace: 'nowrap',
          }}
        >
          {/* Role badge — only visible to me */}
          {role && isMe && (
            <span
              style={{
                background:
                  role === 'mafia'  ? '#ff3344' :
                  role === 'police' ? '#4488ff' :
                  role === 'doctor' ? '#44cc88' : '#777777',
                color: '#fff',
                fontSize: '8px',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: '4px',
                marginBottom: '3px',
                letterSpacing: '0.08em',
                boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                textTransform: 'uppercase',
              }}
            >
              {role}
            </span>
          )}

          {/* Username tag */}
          <span
            style={{
              background: 'rgba(0,0,0,0.78)',
              color: isAlive ? '#ffffff' : '#aaaaaa',
              border: isMe ? `1.5px solid ${color}` : '1px solid rgba(255,255,255,0.18)',
              padding: '3px 9px',
              borderRadius: '7px',
              fontSize: '11px',
              fontWeight: 700,
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
              boxShadow: isMe
                ? `0 0 8px ${color}66, 0 4px 6px rgba(0,0,0,0.4)`
                : '0 4px 6px rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {!isAlive && '👻 '}
            {name}
            {isMe && ' (You)'}
          </span>
        </div>
      </Html>
    </group>
  );
}
