/**
 * Sky.jsx
 * Phase-aware sky component — renders a daytime sky or a starfield at night.
 * Wraps @react-three/drei's <Sky> and <Stars> for clean separation.
 */

import { Sky as DreiSky, Stars } from '@react-three/drei';

export default function GameSky({ phase = 'DAY' }) {
  const isNight = phase === 'NIGHT';

  if (isNight) {
    return (
      <>
        <color attach="background" args={['#04020a']} />
        <Stars
          radius={130}
          depth={55}
          count={4000}
          factor={4}
          fade
          speed={1}
        />
      </>
    );
  }

  return (
    <>
      <color attach="background" args={['#1a1525']} />
      <DreiSky
        distance={450000}
        sunPosition={[10, 8, -5]}
        inclination={0.49}
        azimuth={0.25}
        turbidity={8}
        rayleigh={2}
      />
    </>
  );
}
